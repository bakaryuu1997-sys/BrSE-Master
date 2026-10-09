import json
import logging
import urllib.request
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

def send_slack_webhook(webhook_url: str, message: str) -> bool:
    """Send a notification message to a Slack channel via Webhook URL."""
    try:
        data = json.dumps({"text": message}).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            if status in (200, 201):
                logger.info("Slack webhook notification sent successfully.")
                return True
            else:
                logger.warning(f"Slack webhook returned status code: {status}")
                return False
    except Exception as exc:
        logger.error(f"Failed to send Slack webhook notification: {exc}")
        return False

def send_chatwork_notification(token: str, room_id: str, message: str) -> bool:
    """Send a notification message to a Chatwork room via Chatwork API v2."""
    try:
        url = f"https://api.chatwork.com/v2/rooms/{room_id}/messages"
        # Chatwork expects x-www-form-urlencoded body with 'body' parameter
        data = urllib.parse.urlencode({"body": message}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "X-ChatWorkToken": token,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            if status in (200, 201):
                logger.info("Chatwork message notification sent successfully.")
                return True
            else:
                logger.warning(f"Chatwork API returned status code: {status}")
                return False
    except Exception as exc:
        logger.error(f"Failed to send Chatwork message notification: {exc}")
        return False

def trigger_operation_notification(
    project_name: Optional[str],
    record_type: str,
    title: str,
    action: str, # "create" or "update"
    status: str,
    owner: Optional[str],
    due_date: Optional[str],
    db_session
) -> None:
    """
    Looks up the project settings for project_name, checks integrations_json,
    and sends Slack/Chatwork webhooks if configured and enabled.
    """
    if not project_name:
        return

    from app.models.project import ProjectSettingRecord

    try:
        project = db_session.query(ProjectSettingRecord).filter(ProjectSettingRecord.name == project_name).first()
        if not project or not project.integrations_json:
            return

        try:
            integrations = json.loads(project.integrations_json)
        except json.JSONDecodeError:
            return

        # Check triggers
        notify_qna = integrations.get("notifyOnQna", False)
        notify_cr = integrations.get("notifyOnCr", False)

        if record_type.lower() == "qna" and not notify_qna:
            return
        if record_type.lower() == "cr" and not notify_cr:
            return

        # Compose message
        action_label = "Tạo mới" if action == "create" else "Cập nhật"
        type_label = "Q&A" if record_type.lower() == "qna" else "Yêu cầu Thay đổi (CR)"
        due_label = due_date if due_date else "Chưa có"

        message = (
            f"🔔 *Thông báo từ BrSE OS Cockpit*\n"
            f"Dự án: *{project_name}*\n"
            f"Sự kiện: {action_label} {type_label}\n"
            f"Tiêu đề: *{title}*\n"
            f"Trạng thái: `{status}`\n"
            f"Người chịu trách nhiệm: {owner or 'Chưa phân công'}\n"
            f"Hạn chót (SLA): {due_label}\n"
        )

        slack_url = integrations.get("slackWebhookUrl")
        cw_token = integrations.get("chatworkToken")
        cw_room = integrations.get("chatworkRoomId")

        if slack_url and slack_url.strip():
            logger.info(f"Triggering Slack Webhook notification for project '{project_name}'...")
            send_slack_webhook(slack_url, message)

        if cw_token and cw_token.strip() and cw_room and cw_room.strip():
            logger.info(f"Triggering Chatwork message notification for project '{project_name}'...")
            send_chatwork_notification(cw_token, cw_room, message)

    except Exception as exc:
        logger.error(f"Error during trigger_operation_notification: {exc}", exc_info=True)

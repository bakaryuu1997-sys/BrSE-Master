import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "brse_test_access";
const PASSWORD = process.env.TEST_GATE_PASSWORD?.trim() ?? "";
const TOKEN = `brse-test-${PASSWORD}`;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (PASSWORD.length === 0) {
    return NextResponse.json({ message: "Test gate is disabled." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (password !== PASSWORD) {
    return NextResponse.json({ message: "Sai mật khẩu test." }, { status: 401 });
  }

  const secure = request.nextUrl.protocol === "https:" ? "; Secure" : "";
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": `${COOKIE_NAME}=${TOKEN}; Path=/; Max-Age=${60 * 60 * 12}; HttpOnly; SameSite=Lax${secure}`,
      },
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
      },
    }
  );
}

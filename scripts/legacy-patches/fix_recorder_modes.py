import re

file_path = "frontend/components/LiveRecordingPanel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Change recordingModes to a function
content = content.replace(
    'const recordingModes: ModeConfig[] = [',
    'const getRecordingModes = (t: any): ModeConfig[] => ['
)

# Fix where recordingModes is used
content = content.replace(
    'recordingModes.map((item) => {',
    'getRecordingModes(t).map((item) => {'
)
content = content.replace(
    'const activeMode = recordingModes.find((item) => item.id === mode) ?? recordingModes[0];',
    'const activeMode = getRecordingModes(t).find((item) => item.id === mode) ?? getRecordingModes(t)[0];'
)

# Also fix initial usage if any
content = content.replace(
    'title: activeMode?.title ? `Live ${activeMode.title}` : "Live Meeting Note",',
    'title: activeMode?.title ? `Live ${activeMode.title}` : "Live Meeting Note",'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

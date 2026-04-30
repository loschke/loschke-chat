---
name: SAVA Wissensdatenbank
serverId: sava-agent-context
description: Mission AOK Sachsen-Anhalt — KB für AI-Assistenten (loschke-mcp-hub)
url: ${SAVA_MCP_URL}
transport: http
headers:
  Authorization: Bearer ${SAVA_MCP_TOKEN}
envVar: SAVA_MCP_TOKEN
sortOrder: 10
---

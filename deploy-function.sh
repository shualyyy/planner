#!/bin/bash
set -e

PROJECT_REF="ekmkioezfcmkhkzjgkfd"
BIN="$HOME/.local/bin/supabase"

# Download Supabase CLI if not installed
if ! command -v supabase &> /dev/null && [ ! -f "$BIN" ]; then
  echo "📥 Downloading Supabase CLI (no sudo needed)..."
  mkdir -p "$HOME/.local/bin"
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    URL="https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz"
  else
    URL="https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz"
  fi
  curl -L "$URL" -o /tmp/supabase.tar.gz
  tar -xzf /tmp/supabase.tar.gz -C /tmp
  mv /tmp/supabase "$BIN"
  chmod +x "$BIN"
  echo "✅ Supabase CLI installed to ~/.local/bin"
fi

SUPABASE="${BIN}"
command -v supabase &> /dev/null && SUPABASE="supabase"

echo "🔑 Logging in to Supabase (browser will open)..."
"$SUPABASE" login

echo "🔗 Linking project..."
"$SUPABASE" link --project-ref "$PROJECT_REF"

echo ""
read -rsp "🔐 Paste your GROQ_API_KEY and press Enter: " GROQ_KEY
echo ""

"$SUPABASE" secrets set GROQ_API_KEY="$GROQ_KEY"

echo "📦 Deploying chat function..."
"$SUPABASE" functions deploy chat --no-verify-jwt

echo ""
echo "✅ Done! Edge Function is live."

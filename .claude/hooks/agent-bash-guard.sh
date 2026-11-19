#!/usr/bin/env bash
# PreToolUse-Hook für Bash in den Agent-Dateien: agent-bash-guard.sh planer|umsetzer
# Leitplanke, keine Sandbox. Exit 2 sperrt den Befehl.
mode=$1
input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
cwd=$(jq -r '.cwd // "."' <<<"$input")

block() {
  echo "Für $mode gesperrt: $1" >&2
  exit 2
}

case $mode in
planer)
  # Nur lesende Befehle. Keine Verkettung, Umleitung oder Weitergabe an Interpreter.
  re_meta='[;&><`]|\$\('
  re_pipe='\|[[:space:]]*(tee|sh|bash|zsh|xargs|python3?|node)([[:space:]]|$)'
  re_read='^[[:space:]]*(gh issue (view|list)|git (log|diff|show|status)|grep|rg|ls|cat|head|tail|wc)([[:space:]]|$)'
  [[ $cmd =~ $re_meta || $cmd =~ $re_pipe || $cmd == *--output* ]] && block "keine Verkettung, Umleitung oder Weitergabe"
  [[ $cmd =~ $re_read ]] || block "nur lesende Befehle"
  ;;
umsetzer)
  re_denied='git[[:space:]]+push|gh[[:space:]]+(pr|issue)|git[[:space:]]+add[[:space:]]+(-A|--all|\.([[:space:]]|$))|\.herdr'
  [[ $cmd =~ $re_denied ]] && block "kein Push, PR, Issue-Eingriff, pauschales git add oder .herdr/"
  if [[ $cmd =~ git[[:space:]]+commit ]]; then
    branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
    [[ $branch == main || -z $branch ]] && block "Commit nur auf dem Issue-Branch"
  fi
  ;;
*)
  block "unbekannter Modus"
  ;;
esac
exit 0

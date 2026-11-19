#!/usr/bin/env bash
# PreToolUse-Hook für Bash in den Agent-Dateien: agent-bash-guard.sh planer|umsetzer
# Leitplanke gegen Versehen, keine Sandbox. Exit 2 sperrt den Befehl, jeder
# Fehler beim Lesen der Eingabe sperrt ebenfalls.
mode=$1

block() {
  echo "Für $mode gesperrt: $1" >&2
  exit 2
}

command -v jq >/dev/null || block "jq fehlt"
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input") || block "Eingabe nicht lesbar"
cwd=$(jq -r '.cwd // "."' <<<"$input")
[[ -n $cmd ]] || block "leerer Befehl"

sp='[[:space:]]'
case $mode in
planer)
  # Nur lesende Befehle. Keine Verkettung, Zeilenumbrüche, Umleitung oder
  # Weitergabe an Interpreter, keine Optionen, die Programme ausführen.
  re_meta=$'[;&><`\n\r]|\\$\\('
  re_pipe="\\|$sp*(tee|sh|bash|zsh|xargs|python3?|node)($sp|\$)"
  re_exec="--(pre|ext-diff|textconv|exec-path|output)|git$sp+-c$sp"
  re_read="^$sp*(gh issue (view|list)|git (log|diff|show|status)|grep|rg|ls|cat|head|tail|wc)($sp|\$)"
  [[ $cmd =~ $re_meta || $cmd =~ $re_pipe || $cmd =~ $re_exec ]] && block "keine Verkettung, Umleitung oder Ausführung"
  [[ $cmd =~ $re_read ]] || block "nur lesende Befehle"
  ;;
umsetzer)
  # Textfilter: Optionen zwischen git und Unterbefehl werden mitgefangen.
  re_git="(^|[^[:alnum:]_-])git$sp+(.*$sp)?(push|checkout|switch|-C|config$sp.*alias)($sp|\$)"
  re_gh="(^|[^[:alnum:]_-])gh$sp+(.*$sp)?(pr|issue|api)($sp|\$)"
  re_add="git$sp+add$sp+(.*$sp)?(-A|--all|-u|\\.|\\./|\\*)($sp|\$)"
  re_shell="(^|$sp|[;&|])(eval|(ba|z)?sh$sp+-c)$sp"
  [[ $cmd =~ $re_git || $cmd =~ $re_gh ]] && block "kein Push, Branch-Wechsel, PR oder Issue-Eingriff"
  [[ $cmd =~ $re_add ]] && block "git add nur mit konkreten Pfaden"
  [[ $cmd =~ $re_shell || $cmd == *.herdr* ]] && block "kein eval, sh -c oder .herdr/"
  if [[ $cmd =~ git$sp+(.*$sp)?commit($sp|\$) ]]; then
    branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
    [[ $branch == main || -z $branch ]] && block "Commit nur auf dem Issue-Branch"
  fi
  ;;
*)
  block "unbekannter Modus"
  ;;
esac
exit 0

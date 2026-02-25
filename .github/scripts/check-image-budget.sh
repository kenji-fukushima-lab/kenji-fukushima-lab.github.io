#!/usr/bin/env bash
set -euo pipefail

root_dir="${1:-assets/img}"
max_bytes="${MAX_IMAGE_BYTES:-900000}"

if [[ ! -d "${root_dir}" ]]; then
  echo "Directory not found: ${root_dir}" >&2
  exit 1
fi

if [[ ! "${max_bytes}" =~ ^[0-9]+$ ]]; then
  echo "MAX_IMAGE_BYTES must be numeric. Received: ${max_bytes}" >&2
  exit 1
fi

get_file_size() {
  local path="$1"
  if stat --version >/dev/null 2>&1; then
    stat -c%s "${path}"
  else
    stat -f%z "${path}"
  fi
}

violations=()
while IFS= read -r -d '' file_path; do
  file_size="$(get_file_size "${file_path}")"
  if (( file_size > max_bytes )); then
    violations+=("${file_size}|${file_path}")
  fi
done < <(find "${root_dir}" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \) -print0)

if (( ${#violations[@]} == 0 )); then
  echo "Image budget check passed (${max_bytes} bytes max per image)."
  exit 0
fi

echo "Image budget check failed. Files larger than ${max_bytes} bytes:"
printf '%s\n' "${violations[@]}" | sort -t'|' -k1,1nr | while IFS='|' read -r bytes path; do
  kibibytes=$(( (bytes + 1023) / 1024 ))
  echo " - ${path} (${kibibytes} KiB)"
done

exit 1

#!/usr/bin/env bash
# corners_to_transparent_all.sh
# Usage: bash corners_to_transparent_all.sh /path/to/images [fuzz%]
# Example: bash corners_to_transparent_all.sh ./images 6%

dir="${1:-.}"
fuzz="${2:-5%}"

mkdir -p "$dir/transparent"

for img in "$dir"/*.{png,jpg,jpeg}; do
  [ -e "$img" ] || continue  # skip if none
  base=$(basename "$img")
  out="$dir/transparent/$base"

  echo "Processing $base..."

  convert "$img" -alpha set -channel a -fuzz "$fuzz" -fill transparent \
    -draw "color 1,1 floodfill" \
    -draw "color 524,747 floodfill +524+747" \
    -draw "color 1,747 floodfill +1+747" \
    -draw "color 523,2 floodfill +523+2" \
    +channel "$out"
done

echo "✅ Done! Saved transparent versions in $dir/transparent"

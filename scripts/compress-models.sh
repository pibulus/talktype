#!/bin/bash

# ===================================================================
# Model Compression Script - Create gzip and brotli versions
# ===================================================================

echo "🗜️ Model Compression Tool for TalkType"
echo "======================================"
echo ""

# Create models directory if it doesn't exist
MODELS_DIR="./static/models"
mkdir -p "$MODELS_DIR"

# Function to compress a file
compress_file() {
  local file=$1
  local name=$(basename "$file")
  
  echo "Processing: $name"
  
  # Create gzip version (universal support)
  if [ ! -f "$file.gz" ]; then
    echo "  📦 Creating gzip version..."
    gzip -9 -k "$file"
    echo "  ✅ Created: $name.gz ($(du -h "$file.gz" | cut -f1))"
  else
    echo "  ⏭️  Gzip version already exists"
  fi
  
  # Create brotli version (better compression)
  if command -v brotli &> /dev/null; then
    if [ ! -f "$file.br" ]; then
      echo "  📦 Creating brotli version..."
      brotli -9 "$file" -o "$file.br"
      echo "  ✅ Created: $name.br ($(du -h "$file.br" | cut -f1))"
    else
      echo "  ⏭️  Brotli version already exists"
    fi
  else
    echo "  ⚠️  Brotli not installed. Install with: brew install brotli"
  fi
  
  # Show size comparison
  echo "  📊 Size comparison:"
  echo "     Original: $(du -h "$file" | cut -f1)"
  [ -f "$file.gz" ] && echo "     Gzip:     $(du -h "$file.gz" | cut -f1) ($(echo "scale=1; $(stat -f%z "$file.gz") * 100 / $(stat -f%z "$file")" | bc)%)"
  [ -f "$file.br" ] && echo "     Brotli:   $(du -h "$file.br" | cut -f1) ($(echo "scale=1; $(stat -f%z "$file.br") * 100 / $(stat -f%z "$file")" | bc)%)"
  echo ""
}

# Find all model files (onnx, json, bin)
echo "🔍 Searching for model files..."
echo ""

# Process ONNX models
for file in $(find "$MODELS_DIR" -name "*.onnx" 2>/dev/null); do
  compress_file "$file"
done

# Process JSON configs
for file in $(find "$MODELS_DIR" -name "*.json" 2>/dev/null); do
  compress_file "$file"
done

# Process binary files
for file in $(find "$MODELS_DIR" -name "*.bin" 2>/dev/null); do
  compress_file "$file"
done

echo "✨ Compression complete!"
echo ""
echo "📝 Next steps:"
echo "1. Upload compressed models to GitHub repo: talktype-models"
echo "2. Models will be served automatically via jsDelivr CDN"
echo "3. Browser will auto-decompress based on Accept-Encoding header"
echo ""
echo "🚀 Expected improvements:"
echo "   - 30% smaller downloads with gzip"
echo "   - 35-40% smaller with brotli"
echo "   - Combined with parallel downloads = HYPERSPEED!"
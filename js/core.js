/**
 * ポスターメーカー 共通Canvasライブラリ
 */
const PosterMakerCore = {
  // フォントの事前読み込み
  async preloadFonts(fontsToPreload, sampleText = 'サークル名') {
    const promises = fontsToPreload.map(font => 
      document.fonts.load(`20px ${font}`, sampleText)
    );
    try {
      await Promise.all(promises);
      await document.fonts.ready;
    } catch (err) {
      console.warn('フォント読み込みエラー:', err);
    }
  },

  // キャンバス全体の再描画
  renderCanvas(canvas, state) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // 1. 背景描画
    if (state.bgType === 'color') {
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, 0, width, height);
    } else if (state.bgType === 'image' && state.bgImage) {
      ctx.save();
      const w = state.bgImage.width * state.bgScale;
      const h = state.bgImage.height * state.bgScale;
      ctx.drawImage(state.bgImage, state.bgPos.x, state.bgPos.y, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. メインテキスト描画
    this.drawSingleLineText(ctx, state.mainText);

    // 3. サブテキスト描画
    this.drawMultiLineText(ctx, state.subText);

    // 4. ウォーターマーク描画
    if (state.watermarkEnabled) {
      this.drawWatermarkPattern(ctx, width, height, state.watermarkText, state.watermarkOpacity);
    }
  },

  // 単行テキスト描画
  drawSingleLineText(ctx, item) {
    if (!item.text) return;

    ctx.font = `bold ${item.fontSize}px ${item.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(item.text);
    const padding = 12;
    item.width = metrics.width + padding * 2;
    item.height = item.fontSize + padding * 2;

    if (item.showBg) {
      ctx.fillStyle = item.bgColor;
      ctx.fillRect(
        item.x,
        item.y - item.height / 2,
        item.width,
        item.height
      );
    }

    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x + padding, item.y);
  },

  // 複数行テキスト描画
  drawMultiLineText(ctx, item) {
    if (!item.text) return;

    ctx.font = `${item.fontSize}px ${item.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const lines = item.text.split('\n');
    const lineHeight = item.fontSize * 1.35;
    const padding = 12;

    let maxWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    });

    item.width = maxWidth + padding * 2;
    item.height = (lineHeight * lines.length) + padding * 2;

    if (item.showBg) {
      ctx.fillStyle = item.bgColor;
      ctx.fillRect(
        item.x,
        item.y - item.height / 2,
        item.width,
        item.height
      );
    }

    ctx.fillStyle = item.color;
    const startY = item.y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, item.x + padding, startY + (index * lineHeight));
    });
  },

  // ウォーターマーク描画
  drawWatermarkPattern(ctx, canvasWidth, canvasHeight, text, opacity) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = 260;
    const stepY = 120;

    for (let y = -canvasHeight; y < canvasHeight * 2; y += stepY) {
      for (let x = -canvasWidth; x < canvasWidth * 2; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  // マウス/タッチ座標の取得
  getCanvasPos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  },

  // 当たり判定
  isHit(pos, item) {
    if (!item.text || item.locked) return false;
    return (
      pos.x >= item.x &&
      pos.x <= item.x + item.width &&
      pos.y >= item.y - item.height / 2 &&
      pos.y <= item.y + item.height / 2
    );
  },

  // 画面外はみ出し制御付きの移動計算
  clampPosition(pos, dragStart, item, canvasWidth, canvasHeight) {
    const newX = pos.x - dragStart.x;
    const newY = pos.y - dragStart.y;
    return {
      x: Math.max(0, Math.min(canvasWidth - item.width, newX)),
      y: Math.max(item.height / 2, Math.min(canvasHeight - item.height / 2, newY))
    };
  },

  // 画像ファイル読み込み helper
  loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // モバイル判定
  isMobileDevice() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
};

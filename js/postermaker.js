const { createApp, ref, reactive, onMounted } = Vue;

createApp({
  setup() {
    const canvasRef = ref(null);
    const CANVAS_WIDTH = 860;
    const CANVAS_HEIGHT = 424;

    const showModal = ref(false);
    const resultImageSrc = ref('');

    // 背景設定
    const bgType = ref('color');
    const bgColor = ref('#ffffff');
    const bgImage = ref(null);
    const bgScale = ref(1.0);
    const bgPos = reactive({ x: 0, y: 0 });
    const bgLocked = ref(false);

    // メインテキスト
    const mainText = reactive({
      text: 'サークル名',
      x: 100,
      y: 180,
      fontSize: 42,
      fontFamily: "'Zen Maru Gothic', sans-serif",
      color: '#1a1a1a',
      showBg: true,
      bgColor: '#ffffff',
      locked: false,
      width: 0,
      height: 0
    });

    // サブテキスト
    const subText = reactive({
      text: '活動内容を記載します。\n複数行記載可',
      x: 430,
      y: 270,
      fontSize: 20,
      fontFamily: "'Zen Maru Gothic', sans-serif",
      color: '#4b5563',
      showBg: false,
      bgColor: '#ffffff',
      locked: false,
      width: 0,
      height: 0
    });

    // ウォーターマーク設定
    const watermarkEnabled = ref(true);
    const WATERMARK_TEXT = 'DO NOT TRAINING / DO NOT REPOST';
    const WATERMARK_OPACITY = 0.08;

    // ドラッグ状態
    const isDragging = ref(false);
    const dragTarget = ref(null);
    const dragStartPos = reactive({ x: 0, y: 0 });

    // 描画用の状態オブジェクト（Coreライブラリへ渡す）
    const getRenderState = () => ({
      bgType: bgType.value,
      bgColor: bgColor.value,
      bgImage: bgImage.value,
      bgScale: bgScale.value,
      bgPos,
      mainText,
      subText,
      watermarkEnabled: watermarkEnabled.value,
      watermarkText: WATERMARK_TEXT,
      watermarkOpacity: WATERMARK_OPACITY
    });

    const renderCanvas = () => {
      PosterMakerCore.renderCanvas(canvasRef.value, getRenderState());
    };

    const renderCanvasWithFont = async () => {
      const fonts = [mainText.fontFamily, subText.fontFamily];
      const chars = (mainText.text || ' ') + (subText.text || ' ');
      await PosterMakerCore.preloadFonts(fonts, chars);
      renderCanvas();
    };

    // 背景画像アップロード
    const handleBgUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        bgImage.value = await PosterMakerCore.loadImageFile(file);
        requestAnimationFrame(renderCanvas);
      } catch (err) {
        console.error('画像読み込み失敗:', err);
      }
      e.target.value = '';
    };

    const clearBg = () => {
      bgImage.value = null;
      bgScale.value = 1.0;
      bgPos.x = 0;
      bgPos.y = 0;
      renderCanvas();
    };

    // ドラッグ操作
    const startDrag = (e) => {
      const pos = PosterMakerCore.getCanvasPos(canvasRef.value, e);

      if (PosterMakerCore.isHit(pos, mainText)) {
        if (e.cancelable) e.preventDefault();
        isDragging.value = true;
        dragTarget.value = 'main';
        dragStartPos.x = pos.x - mainText.x;
        dragStartPos.y = pos.y - mainText.y;
        return;
      }

      if (PosterMakerCore.isHit(pos, subText)) {
        if (e.cancelable) e.preventDefault();
        isDragging.value = true;
        dragTarget.value = 'sub';
        dragStartPos.x = pos.x - subText.x;
        dragStartPos.y = pos.y - subText.y;
        return;
      }

      if (bgType.value === 'image' && bgImage.value && !bgLocked.value) {
        if (e.cancelable) e.preventDefault();
        isDragging.value = true;
        dragTarget.value = 'bg';
        dragStartPos.x = pos.x - bgPos.x;
        dragStartPos.y = pos.y - bgPos.y;
      }
    };

    const onDrag = (e) => {
      if (!isDragging.value) return;
      if (e.cancelable) e.preventDefault();

      const pos = PosterMakerCore.getCanvasPos(canvasRef.value, e);

      if (dragTarget.value === 'main') {
        const clamped = PosterMakerCore.clampPosition(pos, dragStartPos, mainText, CANVAS_WIDTH, CANVAS_HEIGHT);
        mainText.x = clamped.x;
        mainText.y = clamped.y;
      } else if (dragTarget.value === 'sub') {
        const clamped = PosterMakerCore.clampPosition(pos, dragStartPos, subText, CANVAS_WIDTH, CANVAS_HEIGHT);
        subText.x = clamped.x;
        subText.y = clamped.y;
      } else if (dragTarget.value === 'bg') {
        bgPos.x = pos.x - dragStartPos.x;
        bgPos.y = pos.y - dragStartPos.y;
      }

      renderCanvas();
    };

    const stopDrag = () => {
      isDragging.value = false;
      dragTarget.value = null;
    };

    // ダウンロード
    const downloadImage = () => {
      const canvas = canvasRef.value;
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');

      if (!PosterMakerCore.isMobileDevice()) {
        const link = document.createElement('a');
        link.download = `poster-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        resultImageSrc.value = dataUrl;
        showModal.value = true;
      }
    };

    onMounted(async () => {
      const fontsToPreload = [
        "'Dela Gothic One', sans-serif",
        "'Kaisei Decol', serif",
        "'New Tegomin', serif",
        "'Noto Serif JP', serif",
        "'RocknRoll One', sans-serif",
        "'WDXL Lubrifont JP N', sans-serif",
        "'Zen Maru Gothic', sans-serif"
      ];
      await PosterMakerCore.preloadFonts(fontsToPreload);
      renderCanvasWithFont();

	const canvas = canvasRef.value;
	  if (canvas) {
	    canvas.addEventListener('touchstart', (e) => startDrag(e), { passive: false });
	    canvas.addEventListener('touchmove', (e) => onDrag(e), { passive: false });
	    canvas.addEventListener('touchend', (e) => stopDrag(e), { passive: false });
	  }
    });

    return {
      canvasRef,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      showModal,
      resultImageSrc,
      bgType,
      bgColor,
      bgImage,
      bgScale,
      bgLocked,
      mainText,
      subText,
      watermarkEnabled,
      handleBgUpload,
      clearBg,
      renderCanvas,
      renderCanvasWithFont,
      startDrag,
      onDrag,
      stopDrag,
      downloadImage
    };
  }
}).mount('#app');
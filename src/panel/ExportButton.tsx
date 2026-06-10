export function ExportButton() {
  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `防雷计算_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <button
      onClick={handleExport}
      className="w-full py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition-colors"
    >
      📸 导出图片
    </button>
  );
}

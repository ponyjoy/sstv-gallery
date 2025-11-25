# SSTV Gallery

这是一个用于展示业余无线电卫星 SSTV (慢扫描电视) 接收图片的静态网站。

## 如何添加图片

1.  将图片上传到 `assets/images` 目录。
2.  **推荐的目录结构**:
    `assets/images/{卫星名称}/{事件名称}/{文件名}.jpg`

    **支持的文件名格式**:
    1. `YYYYMMDD_HHMM` 或 `YYYYMMDD_HHMMSS` (紧凑格式)
    2. `YYYY-MM-DD_HH.MM.SS` 或 `YYYY-MM-DD_HH.MM` (RXSSTV 默认格式)

    示例:
    - `assets/images/ISS/ARISS_Series_20/20231020_1200.jpg`
    - `assets/images/UMKA-1/First_Light/2025-04-03_13.44.47.jpg`

3.  **提交并推送**到 GitHub。
4.  GitHub Actions 会自动运行，生成索引并部署网站。

## 本地运行

1.  安装 Node.js。
2.  运行 `node scripts/generate_index.js` 更新图片索引。
3.  运行 `node scripts/server.js` 启动本地服务器。
4.  打开浏览器访问 `http://localhost:3000`。

## 部署

本项目配置了 GitHub Actions。
请确保在 GitHub 仓库的 Settings -> Pages 中，Source 设置为 `gh-pages` 分支 (第一次运行 Action 后会出现该分支)。

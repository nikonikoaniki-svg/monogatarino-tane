# 物語の種：GitHub Pages版

9つのマスに現れることばを、物語づくりの種として使うWebアプリです。

## GitHubへ公開する手順

1. ZIPファイルを解凍します。
2. GitHubで `monogatari-no-tane` という新しいリポジトリを作ります。
3. リポジトリの「Add file」→「Upload files」を選びます。
4. 解凍したフォルダ内のファイルを、すべてアップロードします。
5. 「Commit changes」を押します。
6. 「Settings」→「Pages」を開きます。
7. 「Build and deployment」の「Source」を `Deploy from a branch` にします。
8. Branchを `main`、フォルダを `/(root)` にして「Save」を押します。
9. 公開処理の完了後、次のURLで開けます。

`https://nikonikoaniki-svg.github.io/monogatari-no-tane/`

## ファイル構成

- `index.html`：画面
- `style.css`：デザイン
- `script.js`：スロット動作とことばの選択
- `words.json`：ことば・読み方・分類・珍しさ・意味のデータ
- `.nojekyll`：GitHub Pages用の設定

## 注意

- ZIPファイルのままでは動きません。必ず解凍して、中のファイルをアップロードしてください。
- `index.html` と `words.json` は同じ階層に置いてください。
- GitHub Pagesで公開すると、Webアプリと `words.json` は誰でも閲覧できる状態になります。

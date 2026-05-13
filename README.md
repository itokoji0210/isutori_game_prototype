# 電車の椅子取りゲーム

空いた席を見つけて、ライバルより早く座るワンボタン寄りのブラウザゲームです。

## 遊び方

- `START`で開始
- `←` / `→` または `A` / `D` で移動
- `Space` / `Enter` で着席
- スマホでは画面下のボタンで操作

空席に早く座るほど高得点です。連続成功でコンボが伸びます。駅が進むほど混雑して、ライバルも増えます。

## 公開方法

このリポジトリをGitHubにpushしたあと、GitHub Pagesで公開できます。

1. GitHubのリポジトリ設定を開く
2. Pagesを選ぶ
3. Sourceを`Deploy from a branch`にする
4. Branchを`main`、folderを`/root`にする

## ファイル構成

- `index.html`: ゲーム画面
- `style.css`: レイアウトと見た目
- `script.js`: ゲームロジック

# オンラインランキングの設定(Firebase Realtime Database)

エンドレスモードのランキング(総合・今日)を、別々のスマホどうしで共有するための設定です。
無料の Firebase(Spark プラン)で動きます。所要時間は5分ほどです。

## 1. データベースを作る
1. <https://console.firebase.google.com/> で「プロジェクトを追加」(名前は自由。Google アナリティクスはオフでOK)
2. 左メニュー「構築」→「Realtime Database」→「データベースを作成」
3. ロケーションは近いもの(日本ならシンガポール)、セキュリティルールは「ロックモード」を選んで作成
4. 画面上部に出る URL(`https://○○○-default-rtdb.○○○.firebasedatabase.app` など)をコピー

## 2. セキュリティルールを貼る
「ルール」タブの中身を、次の内容に置きかえて「公開」を押します。

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "scores": {
      ".read": true,
      ".indexOn": [
        "score"
      ],
      "$id": {
        ".write": "$id.length >= 16 && $id.length <= 64 && newData.exists() && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
        ".validate": "newData.hasChildren(['name', 'score', 'dist'])",
        "name": {
          ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20"
        },
        "score": {
          ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"
        },
        "dist": {
          ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000"
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "daily": {
      "$date": {
        ".read": true,
        ".indexOn": [
          "score"
        ],
        "$id": {
          ".write": "$date.matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) && $id.length >= 16 && $id.length <= 64 && newData.exists() && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name', 'score', 'dist'])",
          "name": {
            ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20"
          },
          "score": {
            ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"
          },
          "dist": {
            ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000"
          },
          "$other": {
            ".validate": false
          }
        }
      }
    }
  }
}
```

このルールでできること:
- 誰でもランキングを読める
- 書きこめるのは次の2か所だけ(どちらも1台につき1件)
  - `scores/{端末ID}` … 総合ランキング
  - `daily/{日付}/{端末ID}` … 今日のランキング(日付は `2026-09-26` の形。日本時間の0時で切りかわる)
- すでにある記録より低いスコアへの上書きや、削除はできない
- 名前は1〜20文字、スコアは0〜1,000,000 の数値だけ

> 注意: `"$other": { ".validate": false }` は、`name` `score` `dist` 以外の項目を禁止するための行です。
> `name` `score` `dist` にも個別の `.validate` を書いているのは、それがないと `"$other"` がこの3つにも当てはまり、すべての書き込みが拒否されるためです。

## 3. ゲームに URL を入れる
`index.html` の先頭近くにある設定を書きかえます。

```js
const RANKING_DB_URL = 'https://○○○-default-rtdb.○○○.firebasedatabase.app';
```

末尾に `/` は付けても付けなくても動きます。

## 4. 公開しなおす
1. `sw.js` の `CACHE_NAME` の数字を上げる(例: `penguin-story-v4`)
2. 変更したファイルを GitHub のリポジトリに push する(GitHub Pages が更新されます)
3. スマホアプリ(APK)の作りなおしは不要です。アプリは2回起動すると新しい版になります

## 注意
- 端末IDはアプリのデータ(localStorage)に保存されます。アプリのデータを消す/入れなおすと別のプレイヤー扱いになり、古い記録はランキングに残ります。
- スマホ側の通信だけで動く仕組みなので、改造したクライアントからの不正なハイスコア送信を完全には防げません。身内で遊ぶ用途ならこのままで十分です。本格的に公開する場合は、サーバー側でスコアを検証する仕組み(Cloud Functions など)が必要です。
- 悪ふざけの投稿を消したいときは、Firebase コンソールの「データ」タブで、該当の項目にマウスを合わせて ✕ を押します。
- `daily` の日付ごとのデータは自動では消えません。増えすぎたら「データ」タブで古い日付を削除してください(1日あたり数百バイト〜数KB程度です)。
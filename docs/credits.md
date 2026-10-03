# 素材・ライセンス・生成記録

制作日：2026年10月3日（日本時間）。既存作品のキャラクター、紋章、画面、音楽を参照・複製していません。

## プロジェクト用素材

| 素材 | 出典・制作方法 | 使用場所 |
| --- | --- | --- |
| 紙片・紋章・鍵・発見の光の透過PNG | OpenAI ImageGen 組み込みツール、オリジナルの2×2所持品パック | `public/assets/`、所持品と入手・脱出画面 |
| 原本PNG | 同上。生成原本をコピーし保持 | `assets/source/inventory-raw.png` |
| 鏡・解読円盤・レンズ・星飾りの鍵の透過PNG | OpenAI ImageGen組み込みツールで追加の2×2パックを生成し、generate2dspriteで処理 | `public/assets/mirror.png`、`decoder.png`、`lens.png`、`star-key.png` |
| 追加素材の原本・プロンプト・QC | 同上、Pythonは `.venv/bin/python` | `assets/source/additional-inventory-raw.png`、`assets/additional-inventory/` |
| 透過処理・フレーム・GIF・QCメタデータ | ユーザーが指定した generate2dsprite スキルのプロセッサー | `assets/inventory/` |
| 部屋、床、壁、家具、旅人 | 本プロジェクトのオリジナルThree.js形状・マテリアル | `src/render/room.ts` |
| 天体の絵、旗、本のしるし、謎の図 | Canvas/DOMの決定的な描画、システムフォントの記号 | `src/render/room.ts`、`src/main.ts` |
| BGM | 本プロジェクトのオリジナルWeb Audio作曲・合成。タイトル「宿屋の朝」、客室・物置・書斎の4テーマ。各96 BPM、256の八分音符ステップ、約80秒。柔らかなピチカート・ベル、三角波の低音、タイトルのフルート風の重なり | `src/audio.ts` |
| 効果音 | 同上。短い合成音、クリック・失敗・正解・入手・解錠・脱出 | `src/audio.ts` |
| フォント | OSの日本語ゴシック／明朝、Georgia等へのフォールバック。フォントファイルの配布なし | CSSとCanvas |

画像のモデル名は組み込みツールから返されていないため記載していません。生成画像には第三者素材のライセンス表示はありません。OpenAIサービスの[利用規約](https://openai.com/policies/terms-of-use/)が適用されます。追加の有料素材や外部画像・音源は使用していません。生成画像に排他的な著作権があるという保証や、未提供の権利条件は記載しません。

生成に使用した最終プロンプト全文は `assets/inventory/prompt-used.txt`。生成元は `/Users/komachi/.codex/generated_images/01a101ad-fff1-7d62-8db3-b5664793d4c0/exec-34b4970f-05a0-46f6-81d7-7baeffaa8aea.png`。元の生成ファイルはその場所にも保持しました。再現用コマンドはREADMEに記載しています。

QC：4フレームとも空画像なし、ソース／出力の端への接触なし、貼り付け時のclampなし。用途が異なる静止アイテムのパックのため、アニメーションの人体スケール整合性ゲートは適用していません。各フレームを目視確認し、透明PNGをゲームに統合しています。

追加の2×2パックも4フレームすべて同じQC項目を通過。生成元は `/Users/komachi/.codex/generated_images/01a101ad-fff1-7d62-8db3-b5664793d4c0/exec-1b62b73b-49d5-432f-8f6e-be5382b354db.png`。最終プロンプト全文は `assets/additional-inventory/prompt-used.txt`。組み込みImageGenを使用し、CLI/APIの代替経路は使用していません。モデル名はツールから返されていません。円盤画像の飾り文字は暗号の判定に使わず、実際の暗号文字は実装で正確に表示します。

## 依存関係

| パッケージ | 固定されたバージョン | ライセンス |
| --- | --- | --- |
| Three.js | 0.180.0 | MIT |
| @types/three | 0.180.0 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vite | 7.3.6 | MIT |
| tsx | 4.23.15 | MIT |
| @playwright/test | 1.63.0 | Apache-2.0 |

開発依存関係はゲーム配信時に実行されません。完全な間接依存関係は `package-lock.json`、ライセンス本文は各パッケージに同梱されています。配布するThree.jsのMIT通知を `public/THIRD_PARTY_LICENSES.txt` に保存しています。

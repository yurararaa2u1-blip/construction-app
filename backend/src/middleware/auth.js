// ========================================
// 建築工事工程管理アプリ - 認証ミドルウェア
// ========================================
// ミドルウェア: ルートの処理が実行される「前」に割り込んで動く関数
// ここでは「JWTトークンが正しいか」を検証し、問題なければ次の処理へ進める

// jsonwebtoken: JWTトークンの検証に使う
const jwt = require('jsonwebtoken');

// ========================================
// JWT認証ミドルウェア
// ========================================
// 使い方: router.get('/me', authMiddleware, getMe)
//         ↑ authMiddleware を挟むと、getMe の前にトークン検証が走る
const authMiddleware = (req, res, next) => {
  // ---- Authorizationヘッダーからトークンを取り出す ----
  // フロントエンドは以下の形式でトークンを送ってくる:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  // "Bearer " の部分を除いた後ろ側がJWTトークン本体
  const authHeader = req.headers['authorization'];

  // ヘッダー自体が存在しない場合 → 401 Unauthorized
  if (!authHeader) {
    return res.status(401).json({ message: '認証トークンがありません' });
  }

  // "Bearer <トークン>" の形式を確認し、トークン部分だけ取り出す
  // split(' ') → ['Bearer', 'eyJ...'] に分割
  // [1] → インデックス1番目（トークン本体）を取得
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'トークンの形式が正しくありません（Bearer <token> の形式で送信してください）' });
  }

  const token = parts[1];

  // ---- JWTトークンを検証する ----
  // jwt.verify: トークンが改ざんされていないか・有効期限内かを確認する
  // 成功すると decoded にトークン生成時に埋め込んだ情報（{ id: userId }）が入る
  // 失敗すると err にエラーが入る
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // トークンの期限切れの場合
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'トークンの有効期限が切れています。再度ログインしてください' });
      }
      // トークンが不正な場合（改ざん・無効な署名など）
      return res.status(401).json({ message: 'トークンが無効です' });
    }

    // ---- 検証成功: req.user にユーザー情報をセットする ----
    // これにより、後続のコントローラーで req.user.id が使えるようになる
    req.user = decoded;

    // next(): 次のミドルウェアまたはルートハンドラーへ処理を進める
    next();
  });
};

// 外部から使えるようにエクスポートする
module.exports = authMiddleware;

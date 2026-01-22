import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// 配置视频上传存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 确保根目录下有 uploads 文件夹
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 1. 登录接口
app.post('/user/login', (req, res) => {
  const { username, password } = req.body;
  // 这里可以替换为您自定义的用户名和密码逻辑
  if (username === 'admin' && password === '123456') {
    res.json({
      code: 1, // 前端 axios 拦截器要求 code 为 1 视为成功
      data: { token: 'mock-token-abc-123' },
      message: '登录成功'
    });
  } else {
    res.json({ code: 0, message: '用户名或密码错误' });
  }
});

// 2. 获取用户信息及路由权限接口
app.get('/user/info', (req, res) => {
  res.json({
    code: 1,
    data: {
      // 这里的数组名称必须与前端 router/index.ts 中的 name 对应
      data: [
        'Index', 'data-source', 'video-manage', 'permission', 
        'user-manage', 'role-manage', 'menu-manage'
      ]
    }
  });
});

// 3. 视频上传接口
app.post('/upload/video', upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({
      code: 1,
      data: {
        url: `http://localhost:3000/uploads/${req.file.filename}`,
        name: req.file.originalname
      },
      message: '上传成功'
    });
  } else {
    res.json({ code: 0, message: '上传失败' });
  }
});

// 静态资源托管，以便前端预览视频
app.use('/uploads', express.static('uploads'));

app.listen(3000, () => {
  console.log('后端服务运行在: http://localhost:3000');
});
/**
 * 注册页面（生产环境版本）
 * 用户注册表单
 *
 * 特性：
 * - 密码强度检测
 * - 密码强度提示
 * - 实时验证
 */

import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Progress, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { checkPasswordStrength } from '../../services/authApi';
import './Register.css';

const { Title, Text } = Typography;

/**
 * 密码强度颜色映射
 */
const STRENGTH_COLORS = {
    weak: '#ff4d4f',
    medium: '#faad14',
    strong: '#52c41a',
};

/**
 * 密码强度标签
 */
const STRENGTH_LABELS = {
    weak: '弱',
    medium: '中',
    strong: '强',
};

/**
 * 注册页面组件
 */
function Register() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(null);

    /**
     * 处理密码变化
     */
    const handlePasswordChange = (e) => {
        const password = e.target.value;
        if (password) {
            const strength = checkPasswordStrength(password);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength(null);
        }
    };

    /**
     * 处理表单提交
     */
    const handleSubmit = async (values) => {
        try {
            setIsLoading(true);
            setErrorMessage('');

            await register({
                username: values.username,
                email: values.email,
                password: values.password,
                full_name: values.full_name || values.username,
            });

            // 注册成功，跳转到登录页
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 1000);
        } catch (error) {
            setErrorMessage(error.message || '注册失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 验证密码是否一致
     */
    const validatePasswordConfirm = (_, value) => {
        const password = form.getFieldValue('password');
        if (!value || password === value) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('两次输入的密码不一致'));
    };

    /**
     * 渲染密码强度指示器
     */
    const renderPasswordStrength = () => {
        if (!passwordStrength) return null;

        const { score, level, checks } = passwordStrength;
        const percent = (score / 5) * 100;

        return (
            <div className="password-strength">
                <div className="password-strength__header">
                    <Text type="secondary" className="password-strength__label">
                        密码强度：
                    </Text>
                    <Text style={{ color: STRENGTH_COLORS[level] }}>
                        {STRENGTH_LABELS[level]}
                    </Text>
                </div>
                <Progress
                    percent={percent}
                    strokeColor={STRENGTH_COLORS[level]}
                    showInfo={false}
                    size="small"
                />
                <div className="password-strength__checks">
                    <Text type={checks.length ? 'success' : 'secondary'} className="password-strength__check">
                        {checks.length ? '✓' : '○'} 8 个字符
                    </Text>
                    <Text type={checks.uppercase ? 'success' : 'secondary'} className="password-strength__check">
                        {checks.uppercase ? '✓' : '○'} 大写字母
                    </Text>
                    <Text type={checks.number ? 'success' : 'secondary'} className="password-strength__check">
                        {checks.number ? '✓' : '○'} 数字
                    </Text>
                    <Text type={checks.special ? 'success' : 'secondary'} className="password-strength__check">
                        {checks.special ? '✓' : '○'} 特殊字符
                    </Text>
                </div>
            </div>
        );
    };

    return (
        <div className="register-page">
            <Card className="register-card">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* 品牌标识 */}
                    <div className="register-brand">
                        <div className="register-brand-logo">SD</div>
                        <Title level={2} className="register-brand-title">
                            SD-WAN
                        </Title>
                    </div>

                    {/* 错误提示 */}
                    {errorMessage && (
                        <Alert
                            message={errorMessage}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setErrorMessage('')}
                        />
                    )}

                    {/* 注册表单 */}
                    <Form
                        form={form}
                        layout="vertical"
                        size="large"
                        onFinish={handleSubmit}
                        autoComplete="off"
                    >
                        <Form.Item
                            name="username"
                            label="用户名"
                            rules={[
                                { required: true, message: '请输入用户名' },
                                { min: 3, message: '用户名至少3个字符' },
                                { max: 50, message: '用户名最多50个字符' },
                                { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="用户名"
                                autoComplete="username"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="邮箱"
                            rules={[
                                { required: true, message: '请输入邮箱' },
                                { type: 'email', message: '请输入有效的邮箱地址' },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="邮箱"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item
                            name="full_name"
                            label="全名（可选）"
                            rules={[
                                { max: 100, message: '全名最多100个字符' },
                            ]}
                        >
                            <Input
                                placeholder="全名"
                                autoComplete="name"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="密码"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 6, message: '密码至少6个字符' },
                                { max: 50, message: '密码最多50个字符' },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                                autoComplete="new-password"
                                onChange={handlePasswordChange}
                            />
                        </Form.Item>

                        {/* 密码强度指示器 */}
                        {renderPasswordStrength()}

                        <Form.Item
                            name="password_confirm"
                            label="确认密码"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: '请再次输入密码' },
                                { validator: validatePasswordConfirm },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="确认密码"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading}
                                block
                            >
                                注册
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* 登录链接 */}
                    <div className="register-footer">
                        <Text type="secondary">已有账号？</Text>
                        <Link to="/login">去登录</Link>
                    </div>
                </Space>
            </Card>
        </div>
    );
}

export default Register;

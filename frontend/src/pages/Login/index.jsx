/**
 * 登录页面（生产环境版本）
 * 用户名/密码登录表单
 *
 * 特性：
 * - 记住我功能（可选）
 * - 登录失败锁定提示
 * - 密码强度提示
 */

import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Space, Checkbox, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './Login.css';

const { Title, Text } = Typography;

// 记住我存储键
const REMEMBER_USERNAME_KEY = 'sdwan_remember_username';

/**
 * 登录页面组件
 */
function Login() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // 获取登录后要跳转的路径
    const from = location.state?.from?.pathname || '/';

    // 初始化记住的用户名
    useEffect(() => {
        try {
            const rememberedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY);
            if (rememberedUsername) {
                form.setFieldsValue({ username: rememberedUsername, remember: true });
            }
        } catch (e) {
            // 忽略错误
        }
    }, [form]);

    /**
     * 处理表单提交
     */
    const handleSubmit = async (values) => {
        try {
            setIsLoading(true);
            setErrorMessage('');

            await login(values.username, values.password);

            // 处理记住我
            if (values.remember) {
                localStorage.setItem(REMEMBER_USERNAME_KEY, values.username);
            } else {
                localStorage.removeItem(REMEMBER_USERNAME_KEY);
            }

            // 登录成功，跳转到原始目标页面或首页
            navigate(from, { replace: true });
        } catch (error) {
            setErrorMessage(error.message || '登录失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <Card className="login-card">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* 品牌标识 */}
                    <div className="login-brand">
                        <div className="login-brand-logo">SD</div>
                        <Title level={2} className="login-brand-title">
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

                    {/* 登录表单 */}
                    <Form
                        form={form}
                        layout="vertical"
                        size="large"
                        onFinish={handleSubmit}
                        autoComplete="off"
                        initialValues={{ remember: false }}
                    >
                        <Form.Item
                            name="username"
                            rules={[
                                { required: true, message: '请输入用户名' },
                                { min: 3, message: '用户名至少3个字符' },
                                { max: 50, message: '用户名最多50个字符' },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="用户名"
                                autoComplete="username"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 6, message: '密码至少6个字符' },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <div className="login-actions">
                                <Form.Item name="remember" valuePropName="checked" noStyle>
                                    <Checkbox>记住用户名</Checkbox>
                                </Form.Item>
                            </div>
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading}
                                block
                            >
                                登录
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* 注册链接 */}
                    <div className="login-footer">
                        <Text type="secondary">还没有账号？</Text>
                        <Link to="/register">去注册</Link>
                    </div>
                </Space>
            </Card>
        </div>
    );
}

export default Login;

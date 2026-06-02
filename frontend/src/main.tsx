import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
// @ts-ignore - JSX module
import { AuthProvider } from './contexts/AuthContext.jsx';
// @ts-ignore - JSX module
import { ThemeProvider } from './contexts/ThemeContext.jsx';
// @ts-ignore - JSX module
import { useTheme, getAntdTheme } from './contexts/ThemeContext.jsx';
import './APP.css';
import './index.css';
import './styles/table.css';
import './styles/theme.css';
import App from './App';

/**
 * 主题配置组件
 * 根据当前主题配置 Ant Design
 */
const ThemeConfig = ({ children }) => {
    const { theme } = useTheme();
    const antdTheme = getAntdTheme(theme);

    return (
        <ConfigProvider theme={antdTheme} locale={zhCN}>
            {children}
        </ConfigProvider>
    );
};

createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
        <BrowserRouter>
            <ThemeConfig>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ThemeConfig>
        </BrowserRouter>
    </ThemeProvider>
);

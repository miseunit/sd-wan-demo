/**
 * ThemeContext 类型声明
 */

export declare const THEME_TYPES: {
    DARK: 'dark';
    LIGHT: 'light';
};

export declare const ThemeProvider: React.FC<{ children: React.ReactNode }>;

export declare const useTheme: () => {
    theme: string;
    toggleTheme: () => void;
    setTheme: (themeType: string) => void;
};

export declare const getAntdTheme: (theme: string) => object;

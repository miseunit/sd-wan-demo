/**
 * useFullscreen — 浏览器全屏 API 封装
 * 提供 toggle / isFullscreen 状态，按 Esc 自动退出
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * 全屏 Hook 返回值
 */
interface UseFullscreenReturn {
    /** 是否处于全屏状态 */
    isFullscreen: boolean;
    /** 切换全屏（进入/退出） */
    toggleFullscreen: () => void;
    /** 退出全屏 */
    exitFullscreen: () => void;
}

/**
 * 封装 Fullscreen API 的自定义 Hook
 * @param targetRef - 需要全屏的目标元素 ref
 */
export default function useFullscreen(targetRef: React.RefObject<HTMLElement | null>): UseFullscreenReturn {
    const [isFullscreen, setIsFullscreen] = useState(false);

    /** 监听全屏状态变化 */
    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    /** 请求全屏 */
    const requestFullscreen = useCallback(async () => {
        try {
            if (targetRef.current) {
                await targetRef.current.requestFullscreen();
            }
        } catch (err) {
            console.warn('全屏切换失败:', err);
        }
    }, [targetRef]);

    /** 退出全屏 */
    const exitFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn('退出全屏失败:', err);
        }
    }, []);

    /** 切换全屏 */
    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            exitFullscreen();
        } else {
            requestFullscreen();
        }
    }, [exitFullscreen, requestFullscreen]);

    return { isFullscreen, toggleFullscreen, exitFullscreen };
}

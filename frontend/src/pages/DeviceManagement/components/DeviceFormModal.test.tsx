/**
 * DeviceFormModal 组件测试
 *
 * 测试重点：
 * 1. 组件渲染
 * 2. 模式切换（新增/编辑）
 * 3. 表单字段存在
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeviceFormModal from './DeviceFormModal';

// Mock API 模块
vi.mock('../../../services/siteApi', () => ({
    getSites: vi.fn().mockResolvedValue({
        items: [
            { id: 'site-1', name: 'HQ', display_name: '总部' },
            { id: 'site-2', name: 'Branch', display_name: '分支' },
        ],
    }),
}));

vi.mock('../api', () => ({
    createDevice: vi.fn().mockResolvedValue({ id: 'new-device' }),
    updateDevice: vi.fn().mockResolvedValue({ id: 'updated-device' }),
}));

describe('DeviceFormModal', () => {
    const defaultProps = {
        visible: true,
        device: null,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('渲染测试', () => {
        /** 测试弹窗显示 */
        it('应该正确显示新增设备标题', () => {
            render(<DeviceFormModal {...defaultProps} />);
            expect(screen.getByText('新增设备')).toBeInTheDocument();
        });

        /** 测试编辑模式标题 */
        it('编辑模式应显示编辑设备标题', () => {
            const device = {
                id: '1',
                name: '测试设备',
                device_type: 'Edge' as const,
                site_id: 'site-1',
            };
            render(<DeviceFormModal {...defaultProps} device={device as any} />);
            expect(screen.getByText('编辑设备')).toBeInTheDocument();
        });

        /** 测试表单字段渲染 */
        it('应该渲染设备名称输入框', () => {
            render(<DeviceFormModal {...defaultProps} />);
            expect(screen.getByLabelText('设备名称')).toBeInTheDocument();
        });

        /** 测试表单标签 */
        it('应该渲染设备类型和绑定站点标签', () => {
            render(<DeviceFormModal {...defaultProps} />);
            expect(screen.getByText('设备类型')).toBeInTheDocument();
            expect(screen.getByText('绑定站点')).toBeInTheDocument();
        });
    });

    describe('编辑模式', () => {
        /** 测试编辑模式表单回显 */
        it('编辑模式应该回显设备名称', () => {
            const device = {
                id: '1',
                name: '测试设备',
                device_type: 'Edge' as const,
                site_id: 'site-1',
            };
            render(<DeviceFormModal {...defaultProps} device={device as any} />);

            // 验证设备名称已回显
            const nameInput = screen.getByLabelText('设备名称') as HTMLInputElement;
            expect(nameInput.value).toBe('测试设备');
        });

        /** 测试新增模式表单为空 */
        it('新增模式表单应该为空', () => {
            render(<DeviceFormModal {...defaultProps} />);
            const nameInput = screen.getByLabelText('设备名称') as HTMLInputElement;
            expect(nameInput.value).toBe('');
        });
    });

    describe('组件结构', () => {
        /** 测试按钮存在 */
        it('应该包含确认和取消按钮', () => {
            render(<DeviceFormModal {...defaultProps} />);
            // Ant Design 默认显示英文按钮
            const allText = document.body.textContent || '';
            expect(allText).toContain('OK');
            expect(allText).toContain('Cancel');
        });
    });
});

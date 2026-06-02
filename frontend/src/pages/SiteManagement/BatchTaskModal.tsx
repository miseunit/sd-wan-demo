/**
 * 批量操作进度弹窗
 * 显示批量操作的实时进度和结果
 */
import { useState, useEffect, useCallback } from 'react';
import { Modal, Progress, Tag, Alert, Timeline, Space, Button, Divider } from 'antd';
import {
    CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
    ClockCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import { getBatchTaskStatus } from '../../services/siteApi';

/**
 * 操作类型标签
 */
const ACTION_LABELS = {
    restart: '批量重启设备',
    switchLink: '批量切换链路',
    upgradeConfig: '批量升级配置',
};

/**
 * 状态配置
 */
const STATUS_CONFIG = {
    pending: { label: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
    running: { label: '执行中', color: 'processing', icon: <LoadingOutlined /> },
    completed: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    failed: { label: '失败', color: 'error', icon: <CloseCircleOutlined /> },
};

export default function BatchTaskModal({ open, taskId, action, onClose }) {
    const [taskStatus, setTaskStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // 轮询任务状态
    const fetchTaskStatus = useCallback(async () => {
        if (!taskId) return;

        try {
            const data = await getBatchTaskStatus(taskId);
            setTaskStatus(data);

            // 如果任务未完成，继续轮询
            if (data.status === 'pending' || data.status === 'running') {
                setTimeout(fetchTaskStatus, 2000); // 每2秒轮询一次
            }
        } catch (error) {
            console.error('获取任务状态失败:', error);
        }
    }, [taskId]);

    // 当弹窗打开时开始轮询
    useEffect(() => {
        if (open && taskId) {
            fetchTaskStatus();
        }
    }, [open, taskId, fetchTaskStatus]);

    // 计算进度百分比
    const percent = taskStatus ? Math.round((taskStatus.completedCount / taskStatus.totalCount) * 100) : 0;

    return (
        <Modal
            title={
                <Space>
                    <SyncOutlined spin={taskStatus?.status === 'running'} />
                    {ACTION_LABELS[action] || '批量操作'}
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    {taskStatus?.status === 'completed' || taskStatus?.status === 'failed' ? '关闭' : '后台运行'}
                </Button>,
            ]}
            width={600}
        >
            {taskStatus && (
                <div className="batch-task-modal">
                    {/* 总体进度 */}
                    <div className="batch-task-modal__progress">
                        <div className="batch-task-modal__progress-header">
                            <span className="batch-task-modal__progress-label">
                                总体进度: {taskStatus.completedCount} / {taskStatus.totalCount}
                            </span>
                            <Tag
                                color={STATUS_CONFIG[taskStatus.status].color}
                                icon={STATUS_CONFIG[taskStatus.status].icon}
                            >
                                {STATUS_CONFIG[taskStatus.status].label}
                            </Tag>
                        </div>
                        <Progress
                            percent={percent}
                            status={taskStatus.status === 'running' ? 'active' : 'normal'}
                            strokeColor={{
                                '0%': '#108ee9',
                                '100%': '#87d068',
                            }}
                        />
                        <div className="batch-task-modal__progress-stats">
                            <Space size="large">
                                <span>
                                    <Tag color="green">成功</Tag>
                                    {taskStatus.successCount}
                                </span>
                                <span>
                                    <Tag color="red">失败</Tag>
                                    {taskStatus.failedCount}
                                </span>
                            </Space>
                        </div>
                    </div>

                    <Divider />

                    {/* 执行详情 */}
                    <div className="batch-task-modal__details">
                        <h4 className="batch-task-modal__details-title">执行详情</h4>
                        <div className="batch-task-modal__timeline">
                            <Timeline
                                items={taskStatus.results.map((result) => ({
                                    color: result.status === 'success' ? 'green' : 'red',
                                    dot: result.status === 'success' ? (
                                        <CheckCircleOutlined style={{ fontSize: 16 }} />
                                    ) : result.status === 'failed' ? (
                                        <CloseCircleOutlined style={{ fontSize: 16 }} />
                                    ) : (
                                        <LoadingOutlined style={{ fontSize: 16 }} />
                                    ),
                                    children: (
                                        <div className="batch-task-modal__result-item">
                                            <div className="batch-task-modal__result-header">
                                                <span className="batch-task-modal__result-site">
                                                    {result.siteName || result.siteId}
                                                </span>
                                                <Tag
                                                    color={result.status === 'success' ? 'success' : 'error'}
                                                    style={{ margin: 0 }}
                                                >
                                                    {result.status === 'success' ? '成功' : '失败'}
                                                </Tag>
                                            </div>
                                            {result.error && (
                                                <Alert
                                                    message={result.error}
                                                    type="error"
                                                    size="small"
                                                    style={{ marginTop: 4 }}
                                                />
                                            )}
                                        </div>
                                    ),
                                }))}
                            />
                        </div>
                    </div>

                    {/* 完成提示 */}
                    {(taskStatus.status === 'completed' || taskStatus.status === 'failed') && (
                        <>
                            <Divider />
                            {taskStatus.status === 'completed' ? (
                                <Alert
                                    message="批量操作已完成"
                                    description={`成功: ${taskStatus.successCount}, 失败: ${taskStatus.failedCount}`}
                                    type="success"
                                    showIcon
                                />
                            ) : (
                                <Alert
                                    message="批量操作失败"
                                    description="操作过程中发生错误，请查看详细信息"
                                    type="error"
                                    showIcon
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}

import React from 'react';

/**
 * Props for the EmptyState component.
 */
interface Props {
    /** Iconify icon name to display (e.g. 'solar:inbox-archive-bold'). */
    icon?: string;
    /** Primary message to display. */
    message: string;
    /** Optional secondary hint message displayed below the main message. */
    subMessage?: string;
}

/**
 * EmptyState Component
 *
 * A standardized empty state indicator used when a list or table has no data.
 * Renders a dashed border container with a centered icon and descriptive text.
 * Use this consistently in place of ad-hoc italic text or custom empty-state markup.
 *
 * @example
 * <EmptyState
 *   icon="solar:inbox-archive-bold"
 *   message="Belum ada data."
 *   subMessage="Klik tombol di atas untuk menambahkan."
 * />
 */
const EmptyState: React.FC<Props> = ({
    icon = 'solar:inbox-archive-bold',
    message,
    subMessage,
}) => {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mb-4">
                <iconify-icon icon={icon} width="28"></iconify-icon>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
            {subMessage && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subMessage}</p>
            )}
        </div>
    );
};

export default EmptyState;

import React from 'react';

/**
 * Props for the StatusBadge component.
 */
interface Props {
    /** The raw status string from the database (e.g. 'active', 'resign', 'contract_end'). */
    status: string | null | undefined;
    
    /** Optional display label override. Defaults to the formatted status string. */
    label?: string;
}

/**
 * Translates the status string to a more human-readable format.
 * @param status The status string to translate.
 * @returns The translated status string.
 */
const translateStatus = (status: string | null | undefined) => {
        const rates: Record<string, string> = {
            active: 'Aktif',
            resign: 'Resign',
            contract_end: 'Kontrak Selesai'
        };
        return status && rates[status] ? rates[status] : status;
    };

/**
 * Returns Tailwind CSS classes for the badge based on the given status value.
 *
 * @param {string | null | undefined} status - The status string to evaluate.
 * @returns {string} A string of Tailwind CSS class names.
 */
const getColorClass = (status: string | null | undefined): string => {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'aktif':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
        case 'resign':
            return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';
        case 'contract_end':
        case 'contract end':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
        default:
            return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
};

/**
 * StatusBadge Component
 *
 * A standardized pill-shaped badge for displaying assignment or entity statuses
 * with semantic color coding. Used consistently across Worker, Assignment,
 * Client, and Project module views.
 *
 * @example
 * <StatusBadge status="active" />
 * <StatusBadge status="resign" />
 * <StatusBadge status={assignment.status} label="Selesai" />
 */
const StatusBadge: React.FC<Props> = ({ status, label }) => {
    if (!status) return <span className="text-slate-400 italic text-xs">-</span>;

    const displayLabel = label ?? translateStatus(status)?.toUpperCase();

    return (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${getColorClass(status)}`}>
            {displayLabel}
        </span>
    );
};

export default StatusBadge;

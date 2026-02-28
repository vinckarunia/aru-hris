import React from 'react';

/**
 * Props for the Pagination component.
 */
interface Props {
    /** Total number of items in the dataset. */
    totalItems: number;
    /** Number of items to display per page. */
    itemsPerPage: number;
    /** The current active page (1-indexed). */
    currentPage: number;
    /** Callback fired when the user navigates to a different page. */
    onPageChange: (page: number) => void;
}

/**
 * Pagination Component
 *
 * Renders a navigation bar with previous/next buttons and page number pills.
 * Automatically hides when there is only one page or no items.
 * Supports ellipsis for large page ranges.
 *
 * @param {Props} props - The component props.
 * @returns {JSX.Element | null} The rendered pagination bar, or null if not needed.
 */
export default function Pagination({ totalItems, itemsPerPage, currentPage, onPageChange }: Props) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    /**
     * Generates the array of page numbers to display, inserting `null` as an ellipsis marker.
     *
     * @returns {(number | null)[]} An ordered array of page numbers / null separators.
     */
    const getPageNumbers = (): (number | null)[] => {
        const delta = 1; // Pages to show on each side of the current page
        const pages: (number | null)[] = [];
        const left = currentPage - delta;
        const right = currentPage + delta;

        let prev: number | null = null;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                if (prev !== null && i - prev > 1) {
                    pages.push(null); // Ellipsis
                }
                pages.push(i);
                prev = i;
            }
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            {/* Info text */}
            <p className="text-sm text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                Menampilkan{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{startItem}–{endItem}</span>
                {' '}dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</span>
                {' '}data
            </p>

            {/* Page buttons */}
            <div className="flex items-center gap-1 order-1 sm:order-2">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Halaman sebelumnya"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                {/* Page number pills */}
                {pageNumbers.map((page, idx) =>
                    page === null ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`min-w-[34px] h-[34px] px-2 text-sm font-medium rounded-lg transition-colors ${page === currentPage
                                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            aria-current={page === currentPage ? 'page' : undefined}
                        >
                            {page}
                        </button>
                    )
                )}

                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Halaman berikutnya"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

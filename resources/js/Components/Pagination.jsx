import React from 'react';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsName = 'registros'
}) => {
  const getPagesToShow = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white/40 border border-gray-100 rounded-3xl shadow-sm backdrop-blur-md">
      {totalItems !== undefined && (
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Total: <span className="text-gray-900">{totalItems.toLocaleString('es-AR')}</span> {itemsName}
        </span>
      )}
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-600 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <i className="fas fa-chevron-left"></i> Ant
        </button>

        <div className="hidden md:flex items-center gap-1">
          {getPagesToShow().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={idx} className="px-3 py-1.5 text-xs font-black text-gray-400">
                  ...
                </span>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#FE8204] text-white shadow-md shadow-[#FE8204]/30'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-600 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
        >
          Sig <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        Pág. <span className="text-gray-900">{currentPage}</span> de <span className="text-gray-900">{totalPages || 1}</span>
      </span>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';

export const Pagination = ({
  links,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsName = 'registros'
}) => {
  // Compute derived current and total pages for Inertia links if not passed explicitly
  let derivedCurrentPage = currentPage;
  let derivedTotalPages = totalPages;

  if (links && Array.isArray(links)) {
    const activeLink = links.find(l => l.active);
    if (activeLink && !derivedCurrentPage) {
      derivedCurrentPage = parseInt(activeLink.label, 10) || 1;
    }
    if (!derivedTotalPages) {
      const pageNumLinks = links
        .map(l => parseInt(l.label, 10))
        .filter(n => !isNaN(n));
      if (pageNumLinks.length > 0) {
        derivedTotalPages = Math.max(...pageNumLinks);
      }
    }
  }

  const activePage = derivedCurrentPage || 1;
  const maxPages = derivedTotalPages || 1;

  const [inputPage, setInputPage] = useState(activePage);

  useEffect(() => {
    setInputPage(activePage);
  }, [activePage]);

  const handleJumpSubmit = (e) => {
    e?.preventDefault();
    const target = parseInt(inputPage, 10);
    if (isNaN(target) || target < 1 || target > maxPages) {
      setInputPage(activePage);
      return;
    }

    if (onPageChange) {
      onPageChange(target);
    } else if (links && Array.isArray(links)) {
      const sampleLink = links.find(l => l.url);
      if (sampleLink) {
        const urlObj = new URL(sampleLink.url, window.location.href);
        urlObj.searchParams.set('page', target);
        router.get(urlObj.pathname + urlObj.search, {}, { preserveScroll: true, preserveState: true });
      }
    }
  };

  // Helper for rendering the Jump Form
  const renderJumpForm = () => (
    <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
      <span>Ir a pág.</span>
      <input
        type="number"
        min="1"
        max={maxPages}
        value={inputPage}
        onChange={(e) => setInputPage(e.target.value)}
        onBlur={handleJumpSubmit}
        className="w-14 text-center bg-white border border-gray-300 rounded-xl px-1.5 py-1 font-black text-gray-900 shadow-xs focus:ring-[#FE8204] focus:border-[#FE8204] text-xs cursor-pointer"
      />
      <span>de <span className="text-gray-900">{maxPages}</span></span>
      <button
        type="submit"
        className="ml-1 px-2.5 py-1 text-[11px] font-black uppercase text-white bg-[#FE8204] hover:bg-[#e07203] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
        title="Ir a página"
      >
        Ir
      </button>
    </form>
  );

  // If Inertia/Laravel Paginator links array is passed:
  if (links && Array.isArray(links)) {
    if (links.length <= 3 && totalItems === undefined) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white/40 border border-gray-100 rounded-3xl shadow-sm backdrop-blur-md w-full">
        {totalItems !== undefined ? (
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Total: <span className="text-gray-900">{totalItems.toLocaleString('es-AR')}</span> {itemsName}
          </span>
        ) : <div />}

        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {links.map((link, idx) => {
            let label = link.label
              .replace('&laquo;', '')
              .replace('&raquo;', '')
              .replace('Previous', 'Ant')
              .replace('Next', 'Sig')
              .replace('Anterior', 'Ant')
              .replace('Siguiente', 'Sig')
              .trim();

            if (!link.url) {
              return (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 text-xs font-black text-gray-400 bg-gray-50/80 rounded-xl border border-gray-100 opacity-50 cursor-not-allowed"
                >
                  {label}
                </span>
              );
            }

            return (
              <Link
                key={idx}
                href={link.url}
                preserveScroll
                preserveState
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all ${
                  link.active
                    ? 'bg-[#FE8204] text-white shadow-md shadow-[#FE8204]/30'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {renderJumpForm()}
      </div>
    );
  }

  // Client-side pagination (with currentPage, totalPages, onPageChange)
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white/40 border border-gray-100 rounded-3xl shadow-sm backdrop-blur-md w-full">
      {totalItems !== undefined ? (
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Total: <span className="text-gray-900">{totalItems.toLocaleString('es-AR')}</span> {itemsName}
        </span>
      ) : <div />}

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

      {renderJumpForm()}
    </div>
  );
};

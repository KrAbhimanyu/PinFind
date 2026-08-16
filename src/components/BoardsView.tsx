import React, { useState } from 'react';
import { Board, Product } from '../types';
import { MasonryGrid } from './MasonryGrid';
import { FolderHeart, Plus, ArrowLeft, Trash2, Edit3, Compass, Sparkles, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BoardsViewProps {
  boards: Board[];
  allProducts: Product[];
  savedProductIds: string[];
  onCreateBoard: (name: string, description?: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onOpenDetail: (product: Product) => void;
  onTrackClick: (product: Product, location: 'card_quick_button' | 'card_hover_button') => void;
  onToggleSave: (productId: string) => void;
  onSaveToBoard: (boardId: string, productId: string) => void;
  onCreateAndSaveBoard: (boardName: string, productId: string) => void;
  onExploreMore: () => void;
  onShowToast: (message: string) => void;
}

export const BoardsView: React.FC<BoardsViewProps> = ({
  boards,
  allProducts,
  savedProductIds,
  onCreateBoard,
  onDeleteBoard,
  onOpenDetail,
  onTrackClick,
  onToggleSave,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onExploreMore,
  onShowToast,
}) => {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    onCreateBoard(newBoardName.trim(), newBoardDesc.trim() || undefined);
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    setNewBoardName('');
    setNewBoardDesc('');
    setIsCreatingBoard(false);
    onShowToast(`Created board "${newBoardName}"!`);
  };

  // If viewing a specific board
  if (selectedBoard) {
    const boardProducts = allProducts.filter(p => selectedBoard.productIds.includes(p.id));

    return (
      <div id="single-board-view" className="space-y-6 animate-in fade-in duration-150">
        {/* Board Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={() => setSelectedBoardId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All Boards
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderHeart className="w-6 h-6 text-rose-600" /> {selectedBoard.name}
            </h1>
            {selectedBoard.description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                {selectedBoard.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium pt-1">
              <span>{boardProducts.length} curated pins saved</span>
              <span>•</span>
              <span>Created {new Date(selectedBoard.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={onExploreMore}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" /> Find More Pins
            </button>

            {boards.length > 1 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete board "${selectedBoard.name}"? Pins will not be deleted.`)) {
                    onDeleteBoard(selectedBoard.id);
                    setSelectedBoardId(null);
                    onShowToast(`Deleted board "${selectedBoard.name}".`);
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Delete this board"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Board Products Masonry */}
        {boardProducts.length === 0 ? (
          <div className="my-12 py-16 px-6 text-center max-w-md mx-auto rounded-3xl bg-slate-50 border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No pins saved in this board yet</h3>
            <p className="text-xs text-slate-500 mb-5">
              Browse the discovery feed and tap the bookmark icon to collect aesthetic products here.
            </p>
            <button
              onClick={onExploreMore}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              Explore Discoveries
            </button>
          </div>
        ) : (
          <MasonryGrid
            products={boardProducts}
            boards={boards}
            savedProductIds={savedProductIds}
            onOpenDetail={onOpenDetail}
            onTrackClick={onTrackClick}
            onToggleSave={onToggleSave}
            onSaveToBoard={onSaveToBoard}
            onCreateAndSaveBoard={onCreateAndSaveBoard}
            onResetFilters={() => {}}
            onShowToast={onShowToast}
          />
        )}
      </div>
    );
  }

  // All Boards Overview
  return (
    <div id="boards-overview-container" className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-900 text-white">
              Moodboards
            </span>
            <span className="text-xs text-slate-500 font-medium">Your Saved Inspo Collections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Curated Inspiration Boards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize discovered affiliate products, dream desk setups, aesthetic interiors, and coffee gear into custom Pinterest boards.
          </p>
        </div>

        <button
          id="create-board-banner-btn"
          onClick={() => setIsCreatingBoard(true)}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Board</span>
        </button>
      </div>

      {/* Modal: Create Board */}
      {isCreatingBoard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Moodboard</h3>
            <p className="text-xs text-slate-500 mb-4">Give your board a name like "Fall Wardrobe" or "Workspace Upgrade".</p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Board Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Workspace Sanctuary"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on vibe, colors, materials..."
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingBoard(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boards Grid Cards */}
      {boards.length === 0 ? (
        <div className="my-12 py-16 px-6 text-center max-w-md mx-auto rounded-3xl bg-slate-50 border border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
            <FolderHeart className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Boards Created Yet</h3>
          <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
            Organize and save your favorite aesthetic discoveries by theme, room setup, or shopping wishlist.
          </p>
          <button
            onClick={() => setIsCreatingBoard(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Your First Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {boards.map((board) => {
          const boardProducts = allProducts.filter(p => board.productIds.includes(p.id));
          const previewImages = boardProducts.slice(0, 3).map(p => p.imageUrl);

          return (
            <div
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className="group cursor-pointer rounded-3xl bg-slate-50 border border-slate-200 p-4 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between hover:-translate-y-1"
            >
              {/* Board Collage / Cover */}
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200/80 grid grid-cols-3 gap-1 p-1">
                {previewImages.length === 0 ? (
                  <div className="col-span-3 h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <FolderHeart className="w-8 h-8 mb-1 text-rose-500" />
                    <span>Empty Board</span>
                  </div>
                ) : previewImages.length === 1 ? (
                  <div className="col-span-3 h-full rounded-xl overflow-hidden">
                    <img src={previewImages[0]} alt={board.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : previewImages.length === 2 ? (
                  <>
                    <div className="col-span-2 h-full rounded-xl overflow-hidden">
                      <img src={previewImages[0]} alt={board.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-1 h-full rounded-xl overflow-hidden">
                      <img src={previewImages[1]} alt={board.name} className="w-full h-full object-cover" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2 h-full rounded-xl overflow-hidden">
                      <img src={previewImages[0]} alt={board.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-1 h-full flex flex-col gap-1">
                      <div className="h-1/2 rounded-lg overflow-hidden">
                        <img src={previewImages[1]} alt={board.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="h-1/2 rounded-lg overflow-hidden">
                        <img src={previewImages[2]} alt={board.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Details */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors">
                    {board.name}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200/70 rounded-md text-slate-700">
                    {board.productIds.length} pins
                  </span>
                </div>
                {board.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {board.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Board } from '../types';
import { Plus, Check, FolderHeart, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SaveToBoardDropdownProps {
  productId: string;
  boards: Board[];
  onSaveToBoard: (boardId: string, productId: string) => void;
  onCreateAndSave: (boardName: string, productId: string) => void;
  onClose: () => void;
}

export const SaveToBoardDropdown: React.FC<SaveToBoardDropdownProps> = ({
  productId,
  boards,
  onSaveToBoard,
  onCreateAndSave,
  onClose,
}) => {
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveToBoard(boardId, productId);
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#e60023', '#111827', '#f59e0b']
      });
    } catch {
      // ignore
    }
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newBoardName.trim()) return;
    onCreateAndSave(newBoardName.trim(), productId);
    try {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#e60023', '#10b981', '#f59e0b']
      });
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div 
      id={`save-board-dropdown-${productId}`}
      className="absolute top-12 right-2 z-50 w-72 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Save to Board</span>
        <button 
          id={`close-dropdown-${productId}`}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 py-1">
        {boards.map((board) => {
          const isAlreadySaved = board.productIds.includes(productId);
          return (
            <button
              key={board.id}
              id={`board-item-${board.id}`}
              onClick={(e) => handleSelect(board.id, e)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-slate-100 text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                  {board.coverImage ? (
                    <img src={board.coverImage} alt={board.name} className="w-full h-full object-cover" />
                  ) : (
                    <FolderHeart className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span className="font-medium text-slate-800 truncate group-hover:text-rose-600">{board.name}</span>
              </div>
              {isAlreadySaved ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-1 bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  Save
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100">
        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="space-y-2">
            <input
              id="new-board-name-input"
              type="text"
              placeholder="Board name (e.g. Modern Desk Inspo)"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newBoardName.trim()}
                className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Create & Save
              </button>
            </div>
          </form>
        ) : (
          <button
            id="create-board-btn"
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create New Board
          </button>
        )}
      </div>
    </div>
  );
};

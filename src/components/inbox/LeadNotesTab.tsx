
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Plus,
  StickyNote,
  User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  fetchLeadNotes, 
  createLeadNote, 
  updateLeadNote, 
  deleteLeadNote,
  type LeadNote 
} from '@/services/leadNotesService';

interface LeadNotesTabProps {
  leadId: string;
  leadName: string;
}

const LeadNotesTab: React.FC<LeadNotesTabProps> = ({ leadId, leadName }) => {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [leadId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const fetchedNotes = await fetchLeadNotes(leadId);
      setNotes(fetchedNotes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsCreating(true);
    try {
      const newNote = await createLeadNote(leadId, newNoteContent.trim());
      setNotes([newNote, ...notes]);
      setNewNoteContent('');
      toast({
        title: "Note created",
        description: "Your note has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditNote = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    try {
      const updatedNote = await updateLeadNote(editingNoteId, editingContent.trim());
      setNotes(notes.map(note => 
        note.id === editingNoteId ? updatedNote : note
      ));
      setEditingNoteId(null);
      setEditingContent('');
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteLeadNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create new note section */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Add New Note</span>
          </div>
          <Textarea
            placeholder={`Add a note about ${leadName}...`}
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            size="sm"
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No notes yet</p>
          <p className="text-gray-400 text-xs">Add your first note above to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <Card key={note.id} className="p-4">
              <div className="space-y-3">
                {/* Note header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {note.profiles?.first_name} {note.profiles?.last_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {new Date(note.created_at).toLocaleDateString()}
                    </Badge>
                    {note.updated_at !== note.created_at && (
                      <Badge variant="secondary" className="text-xs">
                        Updated
                      </Badge>
                    )}
                  </div>
                  
                  {editingNoteId !== note.id && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Note content */}
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {note.content}
                  </div>
                )}

                {/* Separator between notes (except last one) */}
                {index < notes.length - 1 && <Separator className="mt-3" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadNotesTab;

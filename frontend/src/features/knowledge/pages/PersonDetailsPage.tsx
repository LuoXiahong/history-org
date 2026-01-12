import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, Calendar, FileText, User } from 'lucide-react';
import { getPerson, updatePerson, deletePerson, type UpdatePersonDto } from '../api/knowledge.api';
import { PersonForm } from '../components/PersonForm';

function PersonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: person, isLoading, isError } = useQuery({
    queryKey: ['person', id],
    queryFn: () => getPerson(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePersonDto) => updatePerson(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
      setIsEditMode(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePerson(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
      navigate('/people');
    },
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      await deleteMutation.mutateAsync();
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading person details...</p>
        </div>
      </div>
    );
  }

  if (isError || !person) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load person details</p>
          <button
            onClick={() => navigate('/people')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to People
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/people')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to People
      </button>

      {isEditMode ? (
        <PersonForm
          person={person}
          onSubmit={(dto) => updateMutation.mutate(dto as UpdatePersonDto)}
          onCancel={() => setIsEditMode(false)}
          isLoading={updateMutation.isPending}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {person.fullName}
                  </h1>
                  {person.title && (
                    <p className="text-lg text-gray-600 mt-1">{person.title}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            {person.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Biography
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {person.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {person.birthDate && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Birth Date</span>
                  </div>
                  <p className="text-gray-900">{formatDate(person.birthDate)}</p>
                </div>
              )}

              {person.deathDate && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Death Date</span>
                  </div>
                  <p className="text-gray-900">{formatDate(person.deathDate)}</p>
                </div>
              )}
            </div>
          </div>

          {person.events.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Related Events ({person.events.length})
              </h2>
              <div className="space-y-3">
                {person.events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    {event.dateStart && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(event.dateStart)}
                      </p>
                    )}
                    {event.role && (
                      <p className="text-xs text-indigo-600 mt-1">Role: {event.role}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {person.documents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Related Documents ({person.documents.length})
              </h2>
              <div className="space-y-3">
                {person.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <h3 className="font-medium text-gray-900">{doc.fileName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{doc.filePath}</p>
                    {doc.context && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        "{doc.context}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PersonDetailsPage;
export { PersonDetailsPage };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import {
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  type CreatePersonDto,
  type UpdatePersonDto,
} from '../api/knowledge.api';
import { PersonForm } from '../components/PersonForm';
import type { Person } from '../types';

async function getAllPersons(): Promise<Person[]> {
  // For now, we'll use search with empty query to get all persons
  // In a real app, you'd have a dedicated endpoint
  const response = await fetch('/api/v1/knowledge/search?q=&limit=1000');
  const data = await response.json();
  return data.persons || [];
}

function PeoplePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['all-persons'],
    queryFn: getAllPersons,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreatePersonDto) => createPerson(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePersonDto }) =>
      updatePerson(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      setIsFormOpen(false);
      setEditingPerson(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
    },
  });

  const handleEdit = async (personId: string) => {
    const person = await getPerson(personId);
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleDelete = async (personId: string) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      await deleteMutation.mutateAsync(personId);
    }
  };

  const handleSubmit = (dto: CreatePersonDto | UpdatePersonDto) => {
    if (editingPerson) {
      updateMutation.mutate({ id: editingPerson.id, dto: dto as UpdatePersonDto });
    } else {
      createMutation.mutate(dto as CreatePersonDto);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">People</h1>
          <p className="mt-2 text-gray-600">
            Manage historical persons in your knowledge base.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPerson(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Person
        </button>
      </div>

      {isFormOpen && (
        <PersonForm
          person={editingPerson || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingPerson(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading persons...</p>
        </div>
      ) : persons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No persons yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start by adding a person manually or upload documents to extract them.
          </p>
          <button
            onClick={() => {
              setEditingPerson(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Person
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birth Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Death Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {persons.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/people/${person.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {person.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {person.title || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(person.birthDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(person.deathDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(person.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(person.id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PeoplePage;
export { PeoplePage };

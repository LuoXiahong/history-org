import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  enrichPerson,
  type CreatePersonDto,
  type UpdatePersonDto,
} from '../api/knowledge.api';
import type { Person } from '../types';

interface PersonFormProps {
  person?: Person;
  onSubmit: (dto: CreatePersonDto | UpdatePersonDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PersonForm({
  person,
  onSubmit,
  onCancel,
  isLoading = false,
}: PersonFormProps) {
  const [fullName, setFullName] = useState(person?.fullName || '');
  const [firstName, setFirstName] = useState(person?.firstName || '');
  const [lastName, setLastName] = useState(person?.lastName || '');
  const [title, setTitle] = useState(person?.title || '');
  const [birthDate, setBirthDate] = useState(
    person?.birthDate ? person.birthDate.split('T')[0] : '',
  );
  const [deathDate, setDeathDate] = useState(
    person?.deathDate ? person.deathDate.split('T')[0] : '',
  );
  const [description, setDescription] = useState(person?.description || '');
  const [isEnriching, setIsEnriching] = useState(false);

  const handleEnrich = async () => {
    if (!fullName.trim()) {
      alert('Please enter a name first');
      return;
    }

    setIsEnriching(true);
    try {
      const enriched = await enrichPerson(fullName);
      if (enriched.fullName) setFullName(enriched.fullName);
      if (enriched.firstName) setFirstName(enriched.firstName);
      if (enriched.lastName) setLastName(enriched.lastName);
      if (enriched.title) setTitle(enriched.title);
      if (enriched.birthDate) setBirthDate(enriched.birthDate);
      if (enriched.deathDate) setDeathDate(enriched.deathDate);
      if (enriched.description) setDescription(enriched.description);
    } catch (error) {
      console.error('Failed to enrich person:', error);
      alert('Failed to enrich person data. Please fill manually.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Full name is required');
      return;
    }

    const dto: CreatePersonDto | UpdatePersonDto = {
      fullName: fullName.trim(),
      ...(firstName && { firstName: firstName.trim() }),
      ...(lastName && { lastName: lastName.trim() }),
      ...(title && { title: title.trim() }),
      ...(birthDate && { birthDate }),
      ...(deathDate && { deathDate }),
      ...(description && { description: description.trim() }),
    };

    onSubmit(dto);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {person ? 'Edit Person' : 'Add Person'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Napoleon Bonaparte"
                required
              />
              <button
                type="button"
                onClick={handleEnrich}
                disabled={isEnriching || !fullName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                title="Auto-fill with AI"
              >
                {isEnriching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span className="hidden sm:inline">Auto-fill</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter a name and click the ✨ button to auto-fill biographical information
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Napoleon"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Bonaparte"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Emperor, General, Philosopher"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="birthDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Birth Date
              </label>
              <input
                type="date"
                id="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="deathDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Death Date
              </label>
              <input
                type="date"
                id="deathDate"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Biography or description..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !fullName.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {person ? 'Updating...' : 'Creating...'}
                </span>
              ) : person ? (
                'Update Person'
              ) : (
                'Create Person'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiClock,
  FiMessageSquare,
  FiThumbsUp,
  FiEye,
  FiTag,
  FiZap,
} from 'react-icons/fi';
import api, { semanticSearch } from '../utils/api';
import QuestionCard from '../components/QuestionCard';
import TagFilter from '../components/TagFilter';

const QuestionsFeed = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    timeRange: 'all',
  });
  const [semanticMode, setSemanticMode] = useState(false);

  const {
    data: questionsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['questions', searchTerm, selectedTags, sortBy, currentPage, filters],
    () => fetchQuestions(),
    {
      keepPreviousData: true,
      staleTime: 30000,
    }
  );

  const fetchQuestions = async () => {
    if (semanticMode && searchTerm.trim().length > 0) {
      const result = await semanticSearch({
        query: searchTerm,
        tags: selectedTags.join(','),
        status: filters.status,
        timeRange: filters.timeRange,
        limit: 10,
      });

      return {
        questions: result.results.map(r => ({
          ...r,
          votes: { upvotes: [], downvotes: [] },
          voteCount: r.voteCount || 0,
        })),
        pagination: {
          currentPage: 1,
          totalPages: 1,
          total: result.results.length,
          hasNext: false,
          hasPrev: false,
        },
        total: result.results.length,
        semantic: result.semantic,
      };
    }

    const params = new URLSearchParams({
      page: currentPage,
      limit: 10,
      sort: sortBy,
      search: searchTerm,
      tags: selectedTags.join(','),
      status: filters.status,
      timeRange: filters.timeRange,
    });

    const response = await api.get(`api/questions?${params}`);
    return response.data;
  };

  const handleSearch = e => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  };

  const handleTagFilter = tags => {
    setSelectedTags(tags);
    setCurrentPage(1);
  };

  const handleSortChange = newSort => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handleFilterChange = newFilters => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Error loading questions: {error.message}
        </p>
        <button onClick={() => refetch()} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white mb-2">
            Questions
          </h1>
          <p className="text-navy-600 dark:text-navy-300">
            Find answers to your questions or help others
          </p>
        </div>
        <Link to="/ask" className="btn-primary mt-4 lg:mt-0">
          Ask Question
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-6 mb-8">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-navy-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search questions..."
              className="input-field pl-10 pr-24"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setSemanticMode(!semanticMode)}
                className={`p-1.5 rounded text-sm transition-colors ${
                  semanticMode
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                }`}
                title={semanticMode ? 'Semantic search active' : 'Enable semantic search'}
              >
                <FiZap className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="btn-primary py-1 px-4 text-sm"
              >
                Search
              </button>
            </div>
          </div>
          {semanticMode && (
            <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
              AI-powered semantic search active — results match meaning, not just keywords
            </p>
          )}
        </form>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-navy-700 dark:text-navy-300">
              Sort by:
            </span>
            <div className="flex space-x-2">
              {[
                { value: 'newest', label: 'Newest', icon: FiClock },
                { value: 'votes', label: 'Most Voted', icon: FiThumbsUp },
                {
                  value: 'answers',
                  label: 'Most Answers',
                  icon: FiMessageSquare,
                },
                { value: 'views', label: 'Most Viewed', icon: FiEye },
                { value: 'trending', label: 'Trending', icon: FiTrendingUp },
              ].map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                        : 'text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Options */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-navy-700 dark:text-navy-300">
              Filter:
            </span>
            <select
              value={filters.status}
              onChange={e =>
                handleFilterChange({ ...filters, status: e.target.value })
              }
              className="input-field py-1 px-3 text-sm"
            >
              <option value="all">All Questions</option>
              <option value="unanswered">Unanswered</option>
              <option value="answered">Answered</option>
              <option value="accepted">Accepted</option>
            </select>
            <select
              value={filters.timeRange}
              onChange={e =>
                handleFilterChange({ ...filters, timeRange: e.target.value })
              }
              className="input-field py-1 px-3 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tag Filter */}
      <TagFilter selectedTags={selectedTags} onTagChange={handleTagFilter} />

      {/* Questions List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="card p-6 animate-pulse"
            >
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-navy-200 dark:bg-navy-700 rounded"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-navy-200 dark:bg-navy-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-navy-200 dark:bg-navy-700 rounded w-1/2 mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-navy-200 dark:bg-navy-700 rounded w-16"></div>
                    <div className="h-6 bg-navy-200 dark:bg-navy-700 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : questionsData?.questions?.length > 0 ? (
          questionsData.questions.map((question, index) => (
            <motion.div
              key={question._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <QuestionCard question={question} />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2">
              No questions found
            </h3>
            <p className="text-navy-600 dark:text-navy-300 mb-6">
              {searchTerm || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Be the first to ask a question!'}
            </p>
            {!searchTerm && selectedTags.length === 0 && (
              <Link to="/ask" className="btn-primary">
                Ask the first question
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {questionsData?.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-outline px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {Array.from(
              { length: Math.min(5, questionsData.totalPages) },
              (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'btn-outline'
                    }`}
                  >
                    {page}
                  </button>
                );
              }
            )}

            <button
              onClick={() =>
                setCurrentPage(
                  Math.min(questionsData.totalPages, currentPage + 1)
                )
              }
              disabled={currentPage === questionsData.totalPages}
              className="btn-outline px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Results info */}
      {questionsData && (
        <div className="text-center mt-8 text-sm text-navy-500 dark:text-navy-400">
          Showing {(currentPage - 1) * 10 + 1} to{' '}
          {Math.min(currentPage * 10, questionsData.total)} of{' '}
          {questionsData.total} questions
        </div>
      )}
    </div>
  );
};

export default QuestionsFeed;

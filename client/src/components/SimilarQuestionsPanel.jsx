import { Link } from 'react-router-dom';
import { FiMessageSquare, FiEye, FiThumbsUp, FiTag } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const SimilarQuestionsPanel = ({ questions, loading, error, title = 'Similar Questions' }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-lg border border-navy-200 dark:border-navy-700 p-4">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">{title}</h3>
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-navy-200 dark:bg-navy-700 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-lg border border-navy-200 dark:border-navy-700 p-4">
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">
        {title}
        <span className="ml-2 text-xs text-navy-500 dark:text-navy-400 font-normal">
          ({questions.length})
        </span>
      </h3>
      <div className="space-y-3">
        {questions.map(q => (
          <Link
            key={q._id}
            to={`/questions/${q._id}`}
            className="block group"
          >
            <div className="text-sm font-medium text-navy-700 dark:text-navy-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2 transition-colors">
              {q.title}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-navy-500 dark:text-navy-400">
              {typeof q.similarity === 'number' && (
                <span className={`font-medium ${
                  q.similarity > 0.8
                    ? 'text-red-600 dark:text-red-400'
                    : q.similarity > 0.6
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {Math.round(q.similarity * 100)}% match
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiThumbsUp className="w-3 h-3" />
                {q.voteCount}
              </span>
              <span className="flex items-center gap-1">
                <FiMessageSquare className="w-3 h-3" />
                {q.answerCount}
              </span>
              <span className="flex items-center gap-1">
                <FiEye className="w-3 h-3" />
                {q.viewCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarQuestionsPanel;

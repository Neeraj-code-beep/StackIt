import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const DuplicateWarningBanner = ({ duplicates, similar, onDismiss }) => {
  if ((!duplicates || duplicates.length === 0) && (!similar || similar.length === 0)) {
    return null;
  }

  const hasDuplicates = duplicates && duplicates.length > 0;

  return (
    <div className={`rounded-lg border p-4 ${
      hasDuplicates
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${
          hasDuplicates
            ? 'text-red-600 dark:text-red-400'
            : 'text-yellow-600 dark:text-yellow-400'
        }`}>
          <FiAlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-2 ${
            hasDuplicates
              ? 'text-red-800 dark:text-red-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {hasDuplicates
              ? 'This question may be a duplicate'
              : 'Similar questions were found'}
          </p>

          {hasDuplicates && (
            <div className="space-y-1 mb-2">
              {duplicates.map(d => (
                <Link
                  key={d._id}
                  to={`/questions/${d._id}`}
                  className="block text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                >
                  {d.title}
                  <span className="ml-2 text-xs opacity-75">
                    ({Math.round(d.similarity * 100)}% match)
                  </span>
                </Link>
              ))}
            </div>
          )}

          {!hasDuplicates && similar && similar.length > 0 && (
            <div className="space-y-1 mb-2">
              {similar.map(s => (
                <Link
                  key={s._id}
                  to={`/questions/${s._id}`}
                  className="block text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
                >
                  {s.title}
                  <span className="ml-2 text-xs opacity-75">
                    ({Math.round(s.similarity * 100)}% match)
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p className={`text-xs ${
            hasDuplicates
              ? 'text-red-600 dark:text-red-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {hasDuplicates
              ? 'Consider reviewing the existing question instead of creating a new one.'
              : 'These questions may already have the answer you\'re looking for.'}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${
              hasDuplicates
                ? 'text-red-500 dark:text-red-400'
                : 'text-yellow-500 dark:text-yellow-400'
            }`}
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DuplicateWarningBanner;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FiThumbsUp,
  FiThumbsDown,
  FiCheck,
  FiMessageSquare,
  FiEdit,
  FiTrash2,
  FiFlag,
  FiShare,
  FiBookmark,
  FiClock,
  FiEye,
  FiUser,
  FiTag,
  FiArrowLeft,
} from 'react-icons/fi';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api, { getSimilarQuestions } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import CommentSection from '../components/CommentSection';
import SimilarQuestionsPanel from '../components/SimilarQuestionsPanel';

const QuestionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch question data
  const {
    data: questionData,
    isLoading,
    error,
  } = useQuery(
    ['question', id],
    () => api.get(`/questions/${id}`).then(res => res.data),
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch similar questions
  const {
    data: similarData,
    isLoading: similarLoading,
  } = useQuery(
    ['similarQuestions', id],
    () => getSimilarQuestions(id),
    {
      enabled: !!id,
      staleTime: 60000,
    }
  );

  // Join question room for real-time updates
  useEffect(() => {
    if (socket && id) {
      socket.emit('join-question', id);
      return () => socket.emit('leave-question', id);
    }
  }, [socket, id]);

  // Mutations
  const upvoteMutation = useMutation(
    ({ contentType, contentId }) => {
      if (contentType === 'answers') {
        return api.post(`api/answers/${contentId}/upvote`);
      } else {
        return api.post(`api/questions/${contentId}/upvote`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['question', id]);
        toast.success('Upvoted successfully!');
      },
      onError: error => {
        toast.error(error.response?.data?.message || 'Failed to upvote');
      },
    }
  );

  const downvoteMutation = useMutation(
    ({ contentType, contentId }) => {
      if (contentType === 'answers') {
        return api.post(`api/answers/${contentId}/downvote`);
      } else {
        return api.post(`api/questions/${contentId}/downvote`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['question', id]);
        toast.success('Downvoted successfully!');
      },
      onError: error => {
        toast.error(error.response?.data?.message || 'Failed to downvote');
      },
    }
  );

  const acceptAnswerMutation = useMutation(
    answerId => api.post(`api/questions/${id}/accept-answer`, { answerId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['question', id]);
        toast.success('Answer accepted successfully!');
      },
      onError: error => {
        toast.error(error.response?.data?.message || 'Failed to accept answer');
      },
    }
  );

  const submitAnswerMutation = useMutation(
    content => {
      console.log('🔍 Frontend Debug - Submitting answer for question ID:', id);
      console.log('🔍 Frontend Debug - Answer content:', content);
      console.log('🔍 Frontend Debug - API call:', `/answers/${id}`);
      return api.post(`api/answers/${id}`, { content });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['question', id]);
        setAnswerContent('');
        setShowAnswerForm(false);
        setIsSubmitting(false);
        toast.success('Answer posted successfully!');
      },
      onError: error => {
        setIsSubmitting(false);
        toast.error(error.response?.data?.message || 'Failed to post answer');
      },
    }
  );

  const deleteMutation = useMutation(
    ({ contentType, contentId }) =>
      api.delete(`api/${contentType}/${contentId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['question', id]);
        toast.success('Content deleted successfully');
      },
      onError: error => {
        toast.error(error.response?.data?.message || 'Failed to delete');
      },
    }
  );

  // Handlers
  const handleVote = (type, contentType, contentId) => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }
    if (type === 'upvote') {
      upvoteMutation.mutate({ contentType, contentId });
    } else {
      downvoteMutation.mutate({ contentType, contentId });
    }
  };

  const handleAcceptAnswer = answerId => {
    if (!user) {
      toast.error('Please log in to accept answers');
      return;
    }
    acceptAnswerMutation.mutate(answerId);
  };

  const handleSubmitAnswer = () => {
    if (!answerContent.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    setIsSubmitting(true);
    submitAnswerMutation.mutate(answerContent);
  };

  const handleDelete = (contentType, contentId) => {
    if (window.confirm('Are you sure you want to delete this?')) {
      deleteMutation.mutate({ contentType, contentId });
    }
  };

  const getVoteStatus = (votes, userId) => {
    if (!userId) return null;
    const upvoted = votes.upvotes.some(
      vote => vote.user === userId || vote.user?._id === userId
    );
    const downvoted = votes.downvotes.some(
      vote => vote.user === userId || vote.user?._id === userId
    );
    if (upvoted) return 'upvote';
    if (downvoted) return 'downvote';
    return null;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-navy-200 dark:bg-navy-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-navy-200 dark:bg-navy-700 rounded"></div>
            <div className="h-4 bg-navy-200 dark:bg-navy-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">
          Error loading question: {error.message}
        </p>
        <button onClick={() => navigate('/questions')} className="btn-primary">
          Back to Questions
        </button>
      </div>
    );
  }

  const { question, answers } = questionData;

  return (
    <div className="max-w-6xl mx-auto flex gap-6">
      <div className="flex-1 min-w-0">
      {/* Back button */}
      <button
        onClick={() => navigate('/questions')}
        className="flex items-center text-navy-600 dark:text-navy-300 hover:text-navy-900 dark:hover:text-white mb-6 transition-colors"
      >
        <FiArrowLeft className="w-4 h-4 mr-2" />
        Back to Questions
      </button>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-8"
      >
        <div className="flex space-x-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => handleVote('upvote', 'questions', question._id)}
              className={`p-2 rounded-lg transition-colors ${
                getVoteStatus(question.votes, user?._id) === 'upvote'
                  ? 'text-primary-600 bg-primary-100 dark:bg-primary-900'
                  : 'text-navy-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >
              <FiThumbsUp className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-navy-900 dark:text-white">
              {question.votes.upvotes.length - question.votes.downvotes.length}
            </span>
            <button
              onClick={() => handleVote('downvote', 'questions', question._id)}
              className={`p-2 rounded-lg transition-colors ${
                getVoteStatus(question.votes, user?._id) === 'downvote'
                  ? 'text-red-600 bg-red-100 dark:bg-red-900'
                  : 'text-navy-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <FiThumbsDown className="w-5 h-5" />
            </button>
          </div>

          {/* Question content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
                {question.title}
              </h1>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-navy-400 hover:text-navy-600 dark:hover:text-navy-200">
                  <FiShare className="w-4 h-4" />
                </button>
                <button className="p-2 text-navy-400 hover:text-navy-600 dark:hover:text-navy-200">
                  <FiBookmark className="w-4 h-4" />
                </button>
                <button className="p-2 text-navy-400 hover:text-red-600 dark:hover:text-red-400">
                  <FiFlag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question body */}
            <div
              className="prose prose-navy dark:prose-invert max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: question.content }}
            />

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {question.tags.map(tag => (
                <span key={tag} className="badge badge-primary">
                  <FiTag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Question meta */}
            <div className="flex items-center justify-between text-sm text-navy-500 dark:text-navy-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <FiUser className="w-4 h-4" />
                  <span className="hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                    {question.author.username}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiClock className="w-4 h-4" />
                  <span>
                    {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiEye className="w-4 h-4" />
                  <span>{question.viewCount} views</span>
                </div>
              </div>

              {/* Edit/Delete buttons */}
              {user &&
                (user._id === question.author._id || user.role === 'admin') && (
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-1 text-navy-500 hover:text-primary-600 dark:hover:text-primary-400">
                      <FiEdit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete('questions', question._id)}
                      className="flex items-center space-x-1 text-navy-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <CommentSection
          contentType="question"
          contentId={question._id}
          comments={question.comments || []}
        />
      </motion.div>

      {/* Answers section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
            {answers.length} Answer{answers.length !== 1 ? 's' : ''}
          </h2>
          {user && (
            <button
              onClick={() => setShowAnswerForm(!showAnswerForm)}
              className="btn-primary"
            >
              <FiMessageSquare className="w-4 h-4 mr-2" />
              {showAnswerForm ? 'Cancel' : 'Post Answer'}
            </button>
          )}
        </div>

        {/* Answer form */}
        {showAnswerForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">
              Your Answer
            </h3>
            <ReactQuill
              theme="snow"
              value={answerContent}
              onChange={setAnswerContent}
              placeholder="Write your answer here..."
              className="mb-4"
              style={{ minHeight: '200px' }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAnswerForm(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Answer'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Answers list */}
        <div className="space-y-6">
          {answers.map((answer, index) => (
            <motion.div
              key={answer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card p-6 ${
                answer.isAccepted
                  ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                  : ''
              }`}
            >
              <div className="flex space-x-4">
                {/* Vote buttons */}
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => handleVote('upvote', 'answers', answer._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      getVoteStatus(answer.votes, user?._id) === 'upvote'
                        ? 'text-primary-600 bg-primary-100 dark:bg-primary-900'
                        : 'text-navy-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    }`}
                  >
                    <FiThumbsUp className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold text-navy-900 dark:text-white">
                    {answer.votes.upvotes.length -
                      answer.votes.downvotes.length}
                  </span>
                  <button
                    onClick={() =>
                      handleVote('downvote', 'answers', answer._id)
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      getVoteStatus(answer.votes, user?._id) === 'downvote'
                        ? 'text-red-600 bg-red-100 dark:bg-red-900'
                        : 'text-navy-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <FiThumbsDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Answer content */}
                <div className="flex-1">
                  {answer.isAccepted && (
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-3">
                      <FiCheck className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Accepted Answer</span>
                    </div>
                  )}

                  <div
                    className="prose prose-navy dark:prose-invert max-w-none mb-6"
                    dangerouslySetInnerHTML={{ __html: answer.content }}
                  />

                  {/* Answer meta */}
                  <div className="flex items-center justify-between text-sm text-navy-500 dark:text-navy-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <FiUser className="w-4 h-4" />
                        <span className="hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                          {answer.author.username}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-4 h-4" />
                        <span>
                          {new Date(answer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Accept answer button */}
                      {user &&
                        user._id === question.author._id &&
                        !question.acceptedAnswer && (
                          <button
                            onClick={() => handleAcceptAnswer(answer._id)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <FiCheck className="w-4 h-4" />
                            <span>Accept</span>
                          </button>
                        )}

                      {/* Edit/Delete buttons */}
                      {user &&
                        (user._id === answer.author._id ||
                          user.role === 'admin') && (
                          <>
                            <button className="flex items-center space-x-1 text-navy-500 hover:text-primary-600 dark:hover:text-primary-400">
                              <FiEdit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() =>
                                handleDelete('answers', answer._id)
                              }
                              className="flex items-center space-x-1 text-navy-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <FiTrash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                    </div>
                  </div>

                  {/* Comments */}
                  <CommentSection
                    contentType="answer"
                    contentId={answer._id}
                    comments={answer.comments || []}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {answers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2">
              No answers yet
            </h3>
            <p className="text-navy-600 dark:text-navy-300 mb-6">
              Be the first to answer this question!
            </p>
            {user && (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="btn-primary"
              >
                <FiMessageSquare className="w-4 h-4 mr-2" />
                Post Answer
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Similar Questions Sidebar */}
      <div className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-4">
          <SimilarQuestionsPanel
            questions={similarData?.similar || []}
            loading={similarLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionDetailPage;

import React, { Dispatch, SetStateAction } from 'react';

export interface WorkInProgressInfo {
  status: 'in-progress' | 'error';
  task: string;
  desc: string;
  onClose: (() => void) | null;
}

export const handleErrorForRendering = (error: unknown, msg: string): WorkInProgressInfo => {
  let errorMsg = 'Unknown error. See console logs.';
  if (error instanceof Error && error.message.length > 0) {
    errorMsg = error.message;
  } else {
    const stringifiedError = JSON.stringify(error);
    try {
      // Attempt to parse the error JSON string
      const parsedData = JSON.parse(stringifiedError);
      if (parsedData.reason) {
        errorMsg = parsedData.reason;
      } else {
        console.log(`ERROR: ${stringifiedError}`);
      }
    } catch (error) {
      console.log(`ERROR: ${stringifiedError}`);
    }
  }

  return {
    status: 'error',
    task: msg,
    desc: errorMsg,
    onClose: () => {},
  };
};

interface WorkInProgressModalProps {
  isWorking: WorkInProgressInfo | null;
  setIsWorking: Dispatch<SetStateAction<WorkInProgressInfo | null>>;
}

const WorkInProgressModal: React.FC<WorkInProgressModalProps> = ({ isWorking, setIsWorking }) => {
  if (!isWorking) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-sm mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700">
        <div className="p-8 text-center">
          {isWorking.status === 'in-progress' ? (
            <>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-brand-secondary rounded-full animate-spin border-t-transparent"></div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 text-brand-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.168-.217c-.165 0-.33.012-.488.037a18.118 18.118 0 00-3.478.655l.842 1.396a16.611 16.611 0 012.726-.549c.16-.023.323-.035.488-.035s.328.012.488.035c.78.113 1.517.312 2.18.582l.842-1.396a18.118 18.118 0 00-3.478-.655c-.158-.025-.323-.037-.488-.037a2.5 2.5 0 00-1.168.217V5.268a2.502 2.502 0 00-1.102 1.052l-1.223.815a1 1 0 00.22 1.634l1.223.815c.42.28.956.28 1.376 0l1.223-.815a.997.997 0 00.22-1.634l-1.223-.815z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-brand-text-primary">{`${isWorking.task}`}</h2>
              <p className="text-brand-text-secondary mt-2">{`${isWorking.desc}`}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-red-500/10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-brand-text-primary">{`${isWorking.task}`}</h2>
              <p className="text-brand-text-secondary mt-2">
                {`${isWorking.desc}` || 'An unexpected error occurred. Please try again.'}
              </p>
              <button
                onClick={() => {
                  setIsWorking(null);
                  if (isWorking.onClose) {
                    isWorking.onClose();
                  }
                }}
                className="mt-6 px-6 py-2 text-sm font-bold text-brand-text-primary bg-slate-600 rounded-lg hover:bg-slate-500 transition"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkInProgressModal;

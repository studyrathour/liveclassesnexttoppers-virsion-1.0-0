import React, { useState, useEffect, useRef } from 'react';
import { differenceInSeconds } from 'date-fns';

const CountdownTimer = ({ targetTime, onComplete }) => {
  const timerRef = useRef(null);
  const onCompleteCalledRef = useRef(false);

  const calculateTimeLeft = React.useCallback(() => {
    const now = new Date();
    const target = new Date(targetTime);
    const diff = differenceInSeconds(target, now);
    return Math.max(0, diff);
  }, [targetTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    onCompleteCalledRef.current = false;

    timerRef.current = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(timerRef.current);
        if (onComplete && !onCompleteCalledRef.current) {
          onCompleteCalledRef.current = true;
          onComplete();
        }
      }
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [targetTime, onComplete, calculateTimeLeft]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  };

  if (timeLeft <= 0) {
    return <span>Starting...</span>;
  }

  return <span>{formatTime(timeLeft)}</span>;
};

export default CountdownTimer;

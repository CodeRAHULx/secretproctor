import React from 'react';
import { Button } from '../../common/Button';

export function WaitingTile({
  sessionId,
  onCopyLink,
  linkCopied = false,
  aiConfigured = false
}) {
  return (
    <div className="waiting-tile">
      <div className="waiting-content">
        <div className="waiting-icon">👥</div>
        <h3>You're the only one here</h3>
        <p>Share this meeting link with candidates or interviewers to let them join:</p>
        <div className="waiting-link-box">
          <code>{sessionId}</code>
          <Button variant="ghost" size="sm" onClick={onCopyLink}>
            {linkCopied ? '✓ Copied' : 'Copy link'}
          </Button>
        </div>
        {aiConfigured && (
          <div className="waiting-ai-note">
            ✨ AI Translation & Meeting Memo ready when others join
          </div>
        )}
      </div>
    </div>
  );
}

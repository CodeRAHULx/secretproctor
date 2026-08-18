import React from 'react';
import { Button } from '../../common/Button';
import { Users, Copy, Check, Sparkles } from 'lucide-react';

export function WaitingTile({
  sessionId,
  onCopyLink,
  linkCopied = false,
  aiConfigured = false
}) {
  return (
    <div className="waiting-tile">
      <div className="waiting-content">
        <div className="waiting-icon">
          <Users size={36} strokeWidth={1.75} />
        </div>
        <h3>You're the only one here</h3>
        <p>Share this meeting code with candidates or interviewers to let them join:</p>
        <div className="waiting-link-box">
          <code>{sessionId}</code>
          <Button variant="ghost" size="sm" onClick={onCopyLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {linkCopied ? (
              <>
                <Check size={14} strokeWidth={2.5} color="var(--gm-green)" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} />
                <span>Copy link</span>
              </>
            )}
          </Button>
        </div>
        {aiConfigured && (
          <div className="waiting-ai-note">
            <Sparkles size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: 'var(--gm-blue)' }} />
            <span>AI Translation & Meeting Memo ready when others join</span>
          </div>
        )}
      </div>
    </div>
  );
}

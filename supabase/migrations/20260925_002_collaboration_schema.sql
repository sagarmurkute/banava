-- ====================================================================
-- BANAVA PHASE 8: MULTIPLAYER COLLABORATION, PERMISSIONS & COMMENTS
-- ====================================================================

-- 1. Document Collaborators Table
CREATE TABLE IF NOT EXISTS public.document_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, email)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_doc ON public.document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON public.document_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_email ON public.document_collaborators(email);

-- 2. Canvas Comments Table
CREATE TABLE IF NOT EXISTS public.document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_doc ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_page ON public.document_comments(document_id, page_id);

-- 3. Comment Replies Table
CREATE TABLE IF NOT EXISTS public.document_comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.document_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_comment ON public.document_comment_replies(comment_id);

-- 4. Enable Row Level Security
ALTER TABLE public.document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comment_replies ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- Collaborators can view permissions if they are document owner or listed collaborator
CREATE POLICY "Collaborators read policy"
    ON public.document_collaborators FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_collaborators.document_id AND d.user_id = auth.uid()
        )
    );

-- Owners can invite / update / remove collaborators
CREATE POLICY "Collaborators manage policy"
    ON public.document_collaborators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_collaborators.document_id AND d.user_id = auth.uid()
        )
    );

-- Comments policies: users with access can read/write comments
CREATE POLICY "Comments read policy"
    ON public.document_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_comments.document_id AND (
                d.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.document_collaborators c
                    WHERE c.document_id = d.id AND (c.user_id = auth.uid() OR c.email = auth.jwt() ->> 'email')
                )
            )
        )
    );

CREATE POLICY "Comments insert policy"
    ON public.document_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_comments.document_id AND (
                d.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.document_collaborators c
                    WHERE c.document_id = d.id AND (c.user_id = auth.uid() OR c.email = auth.jwt() ->> 'email')
                )
            )
        )
    );

CREATE POLICY "Comments update policy"
    ON public.document_comments FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_comments.document_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Comments delete policy"
    ON public.document_comments FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_comments.document_id AND d.user_id = auth.uid()
        )
    );

-- Comment replies policies
CREATE POLICY "Replies read policy"
    ON public.document_comment_replies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.document_comments c
            WHERE c.id = document_comment_replies.comment_id
        )
    );

CREATE POLICY "Replies insert policy"
    ON public.document_comment_replies FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_comments c
            WHERE c.id = document_comment_replies.comment_id
        )
    );

-- 6. Enable Realtime Publications for Real-time sync & comments
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comment_replies;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_collaborators;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

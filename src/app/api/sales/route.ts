import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infra/container';
import { DailySaleInputSchema } from '@/shared/utils/validation';
import { AppError } from '@/shared/exceptions/AppError';
import { logger } from '@/lib/logger';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getTenantId } from '@/server/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = DailySaleInputSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = await getTenantId(session.user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    const useCase = container.saleUseCase();
    await useCase.execute({ ...validated, tenantId });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: 'errors' in error ? error.errors : undefined }, { status: 400 });
    }
    logger.error('Sales API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

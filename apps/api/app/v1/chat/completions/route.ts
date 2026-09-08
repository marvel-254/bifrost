import { GET as chatGET, POST as chatPOST } from '../../../api/v1/chat/completions/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = chatGET;
export const POST = chatPOST;

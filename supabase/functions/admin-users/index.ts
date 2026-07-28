const ALLOWED_ORIGINS = new Set([
  "https://louisle-hash.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const VALID_ROLES = new Set([
  "admin",
  "sales_admin",
  "supply_admin",
  "planner",
  "sales_user",
  "viewer",
]);

type JsonRecord = Record<string, unknown>;

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(origin: string, status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function serviceHeaders(serviceKey: string, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set("apikey", serviceKey);
  headers.set("Content-Type", "application/json");
  if (serviceKey.split(".").length === 3)
    headers.set("Authorization", `Bearer ${serviceKey}`);
  return headers;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function managedUser(authUser: JsonRecord, profile?: JsonRecord) {
  return {
    id: stringValue(authUser.id),
    email: stringValue(profile?.email) || stringValue(authUser.email),
    fullName: stringValue(profile?.full_name),
    roleKey: stringValue(profile?.role_key) || "viewer",
    isActive: profile?.is_active !== false,
    invitedAt: stringValue(authUser.invited_at) || null,
    emailConfirmedAt: stringValue(authUser.email_confirmed_at) || null,
    lastSignInAt: stringValue(authUser.last_sign_in_at) || null,
    createdAt: stringValue(authUser.created_at) || null,
  };
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const record =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as JsonRecord)
        : {};
    throw new Error(
      stringValue(record.msg) ||
        stringValue(record.message) ||
        stringValue(record.error_description) ||
        `Supabase request failed (${response.status}).`,
    );
  }
  return body;
}

async function writeAudit(
  supabaseUrl: string,
  serviceKey: string,
  input: {
    actorUserId: string;
    actionKey: string;
    entityId: string;
    afterData: JsonRecord;
  },
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_audit_log`, {
    method: "POST",
    headers: serviceHeaders(serviceKey, { Prefer: "return=minimal" }),
    body: JSON.stringify({
      actor_user_id: input.actorUserId,
      action_key: input.actionKey,
      entity_type: "user_profile",
      entity_id: input.entityId,
      after_data: input.afterData,
    }),
  });
  if (!response.ok) console.error("Account audit write failed.", await response.text());
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const responseOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://louisle-hash.github.io";

  if (request.method === "OPTIONS")
    return ALLOWED_ORIGINS.has(origin)
      ? new Response(null, { status: 204, headers: cors(responseOrigin) })
      : json(responseOrigin, 403, { error: "Origin is not allowed." });
  if (request.method !== "POST")
    return json(responseOrigin, 405, { error: "Method not allowed." });
  if (!ALLOWED_ORIGINS.has(origin))
    return json(responseOrigin, 403, { error: "Origin is not allowed." });

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "";
  const serviceKey =
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  if (!supabaseUrl || !publishableKey || !serviceKey)
    return json(responseOrigin, 500, {
      error: "The account administration service is not configured.",
    });

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer "))
    return json(responseOrigin, 401, { error: "Authentication required." });

  try {
    const caller = (await readJson(
      await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: publishableKey,
          Authorization: authorization,
        },
      }),
    )) as JsonRecord;
    const callerId = stringValue(caller.id);
    if (!callerId)
      return json(responseOrigin, 401, { error: "Authentication required." });

    const profileRows = (await readJson(
      await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?select=user_id,role_key,is_active&user_id=eq.${encodeURIComponent(callerId)}&limit=1`,
        {
          headers: {
            apikey: publishableKey,
            Authorization: authorization,
          },
        },
      ),
    )) as JsonRecord[];
    const callerProfile = profileRows[0];
    if (
      !callerProfile ||
      callerProfile.role_key !== "admin" ||
      callerProfile.is_active !== true
    )
      return json(responseOrigin, 403, {
        error: "Administrator access is required.",
      });

    const payload = (await request.json().catch(() => ({}))) as JsonRecord;
    const action = stringValue(payload.action);

    if (action === "list") {
      const [authBody, profiles] = await Promise.all([
        readJson(
          await fetch(
            `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
            { headers: serviceHeaders(serviceKey) },
          ),
        ),
        readJson(
          await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?select=user_id,email,full_name,role_key,is_active&order=created_at.asc`,
            { headers: serviceHeaders(serviceKey) },
          ),
        ),
      ]);
      const profileMap = new Map(
        ((profiles as JsonRecord[]) || []).map((profile) => [
          stringValue(profile.user_id),
          profile,
        ]),
      );
      const authUsers =
        authBody &&
        typeof authBody === "object" &&
        !Array.isArray(authBody) &&
        Array.isArray((authBody as JsonRecord).users)
          ? ((authBody as JsonRecord).users as JsonRecord[])
          : [];
      return json(responseOrigin, 200, {
        users: authUsers.map((user) =>
          managedUser(user, profileMap.get(stringValue(user.id))),
        ),
      });
    }

    if (action === "invite") {
      const email = stringValue(payload.email).toLowerCase();
      const fullName = stringValue(payload.fullName);
      const roleKey = stringValue(payload.roleKey);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(responseOrigin, 400, { error: "A valid email is required." });
      if (!fullName)
        return json(responseOrigin, 400, { error: "Full name is required." });
      if (!VALID_ROLES.has(roleKey))
        return json(responseOrigin, 400, { error: "The role is not valid." });

      const redirectTo =
        "https://louisle-hash.github.io/sales-order-dashboard/";
      const invited = (await readJson(
        await fetch(
          `${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: "POST",
            headers: serviceHeaders(serviceKey),
            body: JSON.stringify({ email, data: { full_name: fullName } }),
          },
        ),
      )) as JsonRecord;
      const userId = stringValue(invited.id);
      if (!userId) throw new Error("Supabase did not return the invited user.");

      const profileBody = {
        user_id: userId,
        email,
        full_name: fullName,
        role_key: roleKey,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      const savedProfiles = (await readJson(
        await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?on_conflict=user_id`,
          {
            method: "POST",
            headers: serviceHeaders(serviceKey, {
              Prefer: "resolution=merge-duplicates,return=representation",
            }),
            body: JSON.stringify(profileBody),
          },
        ),
      )) as JsonRecord[];
      await writeAudit(supabaseUrl, serviceKey, {
        actorUserId: callerId,
        actionKey: "account.invited",
        entityId: userId,
        afterData: profileBody,
      });
      return json(responseOrigin, 200, {
        user: managedUser(invited, savedProfiles[0] || profileBody),
      });
    }

    if (action === "update") {
      const userId = stringValue(payload.userId);
      const fullName = stringValue(payload.fullName);
      const roleKey = stringValue(payload.roleKey);
      const isActive = payload.isActive;
      if (!/^[0-9a-f-]{36}$/i.test(userId))
        return json(responseOrigin, 400, { error: "The user ID is not valid." });
      if (!fullName)
        return json(responseOrigin, 400, { error: "Full name is required." });
      if (!VALID_ROLES.has(roleKey) || typeof isActive !== "boolean")
        return json(responseOrigin, 400, {
          error: "The role or account status is not valid.",
        });
      if (userId === callerId && (roleKey !== "admin" || !isActive))
        return json(responseOrigin, 409, {
          error: "You cannot remove your own administrator access.",
        });

      await readJson(
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: serviceHeaders(serviceKey),
          body: JSON.stringify({
            ban_duration: isActive ? "none" : "876000h",
          }),
        }),
      );
      const savedProfiles = (await readJson(
        await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: "PATCH",
            headers: serviceHeaders(serviceKey, {
              Prefer: "return=representation",
            }),
            body: JSON.stringify({
              full_name: fullName,
              role_key: roleKey,
              is_active: isActive,
              updated_at: new Date().toISOString(),
            }),
          },
        ),
      )) as JsonRecord[];
      const authUser = (await readJson(
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          headers: serviceHeaders(serviceKey),
        }),
      )) as JsonRecord;
      await writeAudit(supabaseUrl, serviceKey, {
        actorUserId: callerId,
        actionKey: "account.updated",
        entityId: userId,
        afterData: {
          full_name: fullName,
          role_key: roleKey,
          is_active: isActive,
        },
      });
      return json(responseOrigin, 200, {
        user: managedUser(authUser, savedProfiles[0]),
      });
    }

    return json(responseOrigin, 400, { error: "Unsupported action." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict = /already|registered|exists/i.test(message);
    return json(responseOrigin, conflict ? 409 : 500, { error: message });
  }
});

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationValues,
} from "@/lib/registration";
import { ROLE_LABEL, type Role, useSession } from "@/lib/session";
import { SUPABASE_SETUP_MESSAGE, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...search,
    ...(search["addRole"] === true ? { addRole: true } : {}),
    ...(typeof search["error"] === "string" ? { oauthError: search["error"] } : {}),
    ...(typeof search["error_description"] === "string"
      ? { oauthErrorDescription: search["error_description"] }
      : {}),
  }),
  head: () => ({
    meta: [{ title: "Register · Prakash Pariwar" }, { name: "robots", content: "noindex" }],
  }),
  component: Register,
});

const INITIAL_VALUES: RegistrationValues = {
  name: "",
  email: "",
  country: "",
  state: "",
  city: "",
  business: "",
  category: "",
  phone: "",
  acceptedPolicies: false,
  businessLogo: null,
  profilePhoto: null,
};

function Register() {
  const { addRole = false, oauthError, oauthErrorDescription } = Route.useSearch();
  const { ready, user, authUser, activeRole, sessionError, refreshAuthUser } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const callbackError = oauthError
    ? oauthError === "access_denied"
      ? "Google sign-in was cancelled. You can try again whenever you're ready."
      : oauthErrorDescription || "Google sign-in could not be completed. Please try again."
    : "";

  useEffect(() => {
    if (!user || !authUser) return;
    setValues((current) => ({
      ...current,
      name: current.name || user.name,
      email: authUser.email ?? user.email,
    }));
  }, [authUser, user]);

  useEffect(() => {
    if (!ready || !authUser || addRole || !user?.roles.length) return;
    const targetRole = activeRole ?? user.roles[0]!;
    void navigate({
      to: targetRole === "manufacturer" ? "/manufacturer" : "/retailer",
      replace: true,
    });
  }, [activeRole, addRole, authUser, navigate, ready, user]);

  useEffect(() => {
    if (!addRole || !user?.roles.length) return;
    if (user.roles.length === 2) {
      const targetRole = user.roles.includes("retailer") ? "retailer" : "manufacturer";
      void navigate({
        to: targetRole === "manufacturer" ? "/manufacturer" : "/retailer",
        replace: true,
      });
    }
  }, [addRole, navigate, user]);

  const update = (field: keyof RegistrationValues, value: string | boolean | File | null) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    const client = supabase;
    if (!role || !authUser || !client) {
      setSubmitError(client ? "Sign in with Google before registering." : SUPABASE_SETUP_MESSAGE);
      return;
    }
    const nextErrors = validateRegistration(values, role);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    const uploadedPaths: string[] = [];
    let profileSaved = false;
    try {
      const { data: verified, error: verifyError } = await client.auth.getUser();
      if (
        verifyError ||
        !verified.user ||
        verified.user.id !== authUser.id ||
        !verified.user.email
      ) {
        throw new Error(
          "Your sign-in session expired or changed. Sign in again before registering.",
        );
      }
      if (verified.user.email !== values.email.trim()) {
        throw new Error("The verified account email changed. Refresh and try again.");
      }
      const upload = async (file: File, kind: string) => {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `${verified.user.id}/${role}/${kind}-${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage.from("profile-assets").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        uploadedPaths.push(path);
        return path;
      };
      const logoPath = await upload(values.businessLogo!, "business-logo");
      const photoPath = await upload(values.profilePhoto!, "profile-photo");
      const { error } = await client.from("user_profiles").insert({
        user_id: verified.user.id,
        role,
        full_name: values.name.trim(),
        email: verified.user.email,
        country: values.country.trim(),
        state: values.state.trim(),
        city: values.city.trim(),
        business_name: values.business.trim(),
        business_logo_path: logoPath,
        profile_photo_path: photoPath,
        category: values.category.trim(),
        contact_number: values.phone.trim(),
        accepted_policies: true,
        terms_accepted_at: new Date().toISOString(),
      });
      if (error) throw error;
      profileSaved = true;

      await refreshAuthUser(role);
      await navigate({
        to: role === "manufacturer" ? "/manufacturer" : "/retailer",
        replace: true,
      });
    } catch (error) {
      let cleanupMessage = "";
      if (!profileSaved && uploadedPaths.length) {
        const { error: cleanupError } = await client.storage
          .from("profile-assets")
          .remove(uploadedPaths);
        if (cleanupError)
          cleanupMessage =
            " Uploaded images could not be cleaned up; please contact support if this persists.";
      }
      setSubmitError(
        (error instanceof Error
          ? error.message
          : "Registration could not be saved. Please try again.") + cleanupMessage,
      );
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <Loading />;

  if (sessionError && authUser) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-7 shadow-card sm:p-9">
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {sessionError}
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
          >
            Retry account loading <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageFrame>
    );
  }

  if (!authUser || !user) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-7 shadow-card sm:p-9">
          <h1 className="font-display text-3xl font-semibold">Register your business</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in with Google to securely associate your registration with your account.
          </p>
          {(submitError || callbackError || sessionError) && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError || callbackError || sessionError}
            </p>
          )}
          {!submitError && !callbackError && !sessionError && !supabase && (
            <p role="status" className="mt-4 rounded-lg bg-muted p-3 text-sm">
              {SUPABASE_SETUP_MESSAGE}
            </p>
          )}
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
          >
            Go to sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageFrame>
    );
  }

  if (sessionError) {
    return (
      <PageFrame>
        <p
          role="alert"
          className="mx-auto max-w-lg rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
        >
          {sessionError}
        </p>
      </PageFrame>
    );
  }

  if (user.roles.length && !addRole) return <Loading />;
  if (!role) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Google account verified
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            How do you work with the Pariwar?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose a workspace. You can add the other role later.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {(["manufacturer", "retailer"] as Role[]).map((option) => {
              const existing = user.roles.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={existing}
                  onClick={() => setRole(option)}
                  className="group flex min-h-36 flex-col items-start rounded-xl border bg-card p-5 text-left transition hover:border-primary hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Check className="h-5 w-5" />
                  </span>
                  <span className="mt-4 font-semibold">{ROLE_LABEL[option]}</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {existing
                      ? "Already registered"
                      : option === "manufacturer"
                        ? "Publish campaigns and templates"
                        : "Personalise and share creatives"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => setRole(null)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Change role
        </button>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {ROLE_LABEL[role]} registration
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Tell us about your business</h1>
        <p className="mt-2 text-muted-foreground">
          Your Google email is verified and cannot be changed here.
        </p>

        <form
          onSubmit={submit}
          noValidate
          className="mt-7 space-y-7 rounded-2xl border bg-card p-5 shadow-card sm:p-8"
        >
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={values.name}
              error={errors.name}
              required
              onChange={(value) => update("name", value)}
            />
            <TextField
              label="Google email"
              type="email"
              value={values.email}
              error={errors.email}
              required
              readOnly
            />
            <TextField
              label="Country"
              value={values.country}
              error={errors.country}
              required
              onChange={(value) => update("country", value)}
            />
            <TextField
              label="State"
              value={values.state}
              error={errors.state}
              required
              onChange={(value) => update("state", value)}
            />
            <TextField
              label="City / place"
              value={values.city}
              error={errors.city}
              required
              onChange={(value) => update("city", value)}
            />
            <TextField
              label={role === "manufacturer" ? "Business / company name" : "Shop / business name"}
              value={values.business}
              error={errors.business}
              required
              onChange={(value) => update("business", value)}
            />
            <TextField
              label="Business category / industry"
              value={values.category}
              error={errors.category}
              required
              onChange={(value) => update("category", value)}
            />
            <TextField
              label="Business contact number"
              type="tel"
              value={values.phone}
              error={errors.phone}
              required
              onChange={(value) => update("phone", value)}
            />
          </div>

          <div>
            <h2 className="text-base font-semibold">Images</h2>
            <p className="mt-1 text-sm text-muted-foreground">PNG, JPG or WebP, up to 5 MB each.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ImageUpload
                label="Business logo"
                value={values.businessLogo}
                error={errors.businessLogo}
                onChange={(file) => update("businessLogo", file)}
              />
              <ImageUpload
                label="Personal profile photo"
                value={values.profilePhoto}
                error={errors.profilePhoto}
                onChange={(file) => update("profilePhoto", file)}
              />
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={values.acceptedPolicies}
                onChange={(event) => update("acceptedPolicies", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>I accept the Terms and Privacy Policy.</span>
            </label>
            {errors.acceptedPolicies && (
              <p role="alert" className="mt-1 ml-7 text-sm text-destructive">
                {errors.acceptedPolicies}
              </p>
            )}
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Saving registration...
              </>
            ) : (
              <>
                Complete registration <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-9 inline-flex">
          <Logo />
        </Link>
        {children}
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  error,
  type = "text",
  required = false,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  error?: string | undefined;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        required={required}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-invalid={Boolean(error)}
        className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 read-only:bg-muted"
      />
      {error && (
        <span role="alert" className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

function ImageUpload({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: File | null;
  error?: string | undefined;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!value || !value.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const choose = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(event.target.files?.[0] ?? null);
  return (
    <div>
      <span className="text-sm font-medium">
        {label}
        <span className="ml-1 text-destructive">*</span>
      </span>
      <label className="mt-1.5 flex min-h-28 cursor-pointer items-center gap-4 rounded-lg border border-dashed border-input bg-background p-3 hover:border-primary">
        {preview ? (
          <img
            src={preview}
            alt={`${label} preview`}
            className="h-20 w-20 rounded-md border object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {value?.name ?? "Choose an image"}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {value ? "Select again to replace" : "PNG, JPG or WebP · max 5 MB"}
          </span>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={choose}
          className="sr-only"
        />
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle
        className="h-6 w-6 animate-spin text-primary"
        aria-label="Loading registration"
      />
    </div>
  );
}

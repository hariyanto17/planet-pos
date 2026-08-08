import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useLoginMutation } from "../lib/api/authApi";
import { useAppDispatch } from "../lib/store/hooks";
import { setCredentials } from "../lib/store/features/auth/slice";
import { useTheme, Theme } from "../theme";

const loginSchema = zod.object({
  username: zod.string().min(1, "Username wajib diisi"),
  password: zod.string().min(1, "Password wajib diisi"),
});

type LoginSchemaInput = zod.infer<typeof loginSchema>;

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const [login, { isLoading, error: apiError }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginSchemaInput) => {
    try {
      const result = await login(data).unwrap();
      dispatch(setCredentials(result));
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return "";
    if ("data" in error) {
      return (error.data as any)?.message || "Kredensial masuk tidak valid";
    }
    return "Terjadi kesalahan. Silakan coba lagi.";
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Planet Concessions</Text>
        <Text style={styles.subtitle}>Konsol masuk POS Seluler</Text>

        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getErrorMessage(apiError)}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Nama Pengguna</Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="Masukkan nama pengguna"
                placeholderTextColor={theme.textMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
              />
            )}
          />
          {errors.username ? <Text style={styles.fieldError}>{errors.username.message}</Text> : null}

          <Text style={[styles.label, { marginTop: 12 }]}>Kata Sandi</Text>
          <View style={styles.passwordWrapper}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                />
              )}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.toggleText}>{showPassword ? "Sembunyikan" : "Tampilkan"}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 20,
    },
    errorBanner: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.2)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      color: theme.error,
      fontSize: 13,
    },
    form: {
      width: "100%",
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textSecondary,
      marginBottom: 6,
    },
    input: {
      height: 44,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      color: theme.textPrimary,
      fontSize: 15,
    },
    passwordWrapper: {
      position: "relative",
      justifyContent: "center",
    },
    passwordInput: {
      height: 44,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingLeft: 12,
      paddingRight: 80,
      color: theme.textPrimary,
      fontSize: 15,
    },
    toggleButton: {
      position: "absolute",
      right: 12,
      height: "100%",
      justifyContent: "center",
    },
    toggleText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    inputError: {
      borderColor: theme.error,
    },
    fieldError: {
      color: theme.error,
      fontSize: 11,
      marginTop: 4,
    },
    button: {
      height: 44,
      backgroundColor: theme.primary,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
  });

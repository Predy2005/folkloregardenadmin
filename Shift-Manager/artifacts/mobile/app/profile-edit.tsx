import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL, MOBILE_PATHS } from "@/constants/api";
import { useColors } from "@/hooks/useColors";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { secureGet } from "@/lib/secureStorage";
import { useAuthStore } from "@/stores/authStore";

/**
 * Edit profilu (mobilní app — vlastní účet).
 * Editovatelná pole: firstName, lastName, phone, email + profilová fotka.
 *
 * Backend vyžaduje IS_AUTHENTICATED_FULLY → endpoint `PATCH /api/mobile/me`.
 * Po úspěchu reloaduje user (aby se kartová info v profile.tsx aktualizovala).
 */
export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const reloadUser = useAuthStore((s) => s.reloadUser);

  // Pre-fill ze staff/driver navázaného profilu (priorita: staff → driver)
  const sourceFirstName =
    user?.staffMemberFirstName ?? user?.transportDriverFirstName ?? "";
  const sourceLastName =
    user?.staffMemberLastName ?? user?.transportDriverLastName ?? "";
  const sourcePhone =
    user?.staffMemberPhone ?? user?.transportDriverPhone ?? "";
  const sourceEmail =
    user?.staffMemberEmail ?? user?.transportDriverEmail ?? "";
  const sourcePhotoUrl =
    user?.staffMemberPhotoUrl ?? user?.transportDriverPhotoUrl ?? null;

  const [firstName, setFirstName] = useState(sourceFirstName);
  const [lastName, setLastName] = useState(sourceLastName);
  const [phone, setPhone] = useState(sourcePhone);
  const [email, setEmail] = useState(sourceEmail);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Chybí údaje", "Vyplň jméno i příjmení.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(MOBILE_PATHS.meProfile, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() === "" ? null : phone.trim(),
          email: email.trim() === "" ? null : email.trim(),
        }),
      });
      await reloadUser();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Uložení selhalo.";
      Alert.alert("Nepodařilo se uložit", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Oprávnění zamítnuto",
        "Pro výběr fotky povol přístup k fotkám v nastavení.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    setUploadingPhoto(true);
    try {
      // multipart upload — apiFetch má JSON header default, tak voláme fetch přímo.
      //
      // Platform-specific FormData attach:
      //   - Web: prohlížeč chce reálný Blob (RN-style {uri,type,name} se
      //     stringifyne na "[object Object]" → backend dostane prázdné pole).
      //     Fetchneme blob: / data: URI z ImagePickeru a předáme Blob.
      //   - Native (iOS/Android): Expo networking layer transformuje
      //     {uri,type,name} na multipart entry sám.
      const formData = new FormData();
      const fileType = asset.mimeType ?? "image/jpeg";
      const fileName =
        asset.fileName ?? `photo.${fileType.split("/")[1] ?? "jpg"}`;

      if (Platform.OS === "web") {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append("photo", blob, fileName);
      } else {
        formData.append("photo", {
          uri: asset.uri,
          type: fileType,
          name: fileName,
        } as never);
      }

      const accessToken = await secureGet("accessToken");
      const response = await fetch(`${API_BASE_URL}${MOBILE_PATHS.mePhoto}`, {
        method: "POST",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
          // NEROZPOZNÁVAJ Content-Type — fetch ho nastaví sám i s boundary
        },
        body: formData,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      await reloadUser();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nepodařilo se nahrát fotku",
        e instanceof Error ? e.message : "Zkus to prosím znovu.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!sourcePhotoUrl) return;
    Alert.alert("Smazat fotku?", "Profilová fotka se odstraní z účtu.", [
      { text: "Zrušit", style: "cancel" },
      {
        text: "Smazat",
        style: "destructive",
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await apiFetch(MOBILE_PATHS.mePhoto, { method: "DELETE" });
            await reloadUser();
          } catch (e) {
            Alert.alert(
              "Nepodařilo se smazat fotku",
              e instanceof Error ? e.message : "Zkus to prosím znovu.",
            );
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Upravit profil
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto */}
        <View style={styles.photoSection}>
          {sourcePhotoUrl ? (
            <Image
              source={{ uri: `${API_BASE_URL}${sourcePhotoUrl}` }}
              style={styles.photo}
            />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="user" size={48} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.primary }]}
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="camera" size={16} color="#fff" />
                  <Text style={styles.photoBtnText}>
                    {sourcePhotoUrl ? "Změnit fotku" : "Přidat fotku"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {sourcePhotoUrl && (
              <TouchableOpacity
                style={[styles.photoBtnSecondary, { borderColor: colors.border }]}
                onPress={() => void handleRemovePhoto()}
                disabled={uploadingPhoto}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Field
            label="Jméno"
            value={firstName}
            onChange={setFirstName}
            colors={colors}
            autoCapitalize="words"
          />
          <Field
            label="Příjmení"
            value={lastName}
            onChange={setLastName}
            colors={colors}
            autoCapitalize="words"
          />
          <Field
            label="Telefon"
            value={phone}
            onChange={setPhone}
            colors={colors}
            keyboardType="phone-pad"
          />
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            colors={colors}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary },
            saving && styles.saveBtnDisabled,
          ]}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Uložit změny</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  scroll: { padding: 20, gap: 24 },
  photoSection: { alignItems: "center", gap: 12 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  photoActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 40,
  },
  photoBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  photoBtnSecondary: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  form: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});

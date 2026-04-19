package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	apiKey string
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey}
}

func (c *Client) SendVerification(to, code string) error {
	body, _ := json.Marshal(map[string]any{
		"from":    "DUO <onboarding@resend.dev>",
		"to":      []string{to},
		"subject": "Your DUO verification code",
		"html": fmt.Sprintf(`<div style="font-family:sans-serif;max-width:420px;margin:0 auto">
			<h2 style="color:#111;margin-bottom:8px">Verify your DUO account</h2>
			<p style="color:#555;margin-bottom:24px">Enter this code in the app to confirm your email address:</p>
			<div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111;padding:24px;background:#f5f5f5;border-radius:8px;text-align:center">%s</div>
			<p style="color:#999;font-size:12px;margin-top:24px">Expires in 15 minutes. If you didn't create a DUO account, ignore this email.</p>
		</div>`, code),
	})

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend returned %d", resp.StatusCode)
	}
	return nil
}

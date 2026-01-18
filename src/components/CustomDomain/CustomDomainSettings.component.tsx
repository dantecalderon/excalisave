import {
  Box,
  Text,
  Button,
  Flex,
  Heading,
  TextField,
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import React, { useState, useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import { CustomDomain } from "../../background/background.interfaces";

export const CustomDomainsSettings: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: "GET_CUSTOM_DOMAINS" })
      .then((res) => setDomains(res.domains || []));
  }, []);

  const addDomain = async () => {
    try {
      const url = new URL(newDomain);
      const origin = url.origin;

      const result = await browser.runtime.sendMessage({
        type: "ADD_CUSTOM_DOMAIN",
        payload: { origin },
      });

      if (result.success) {
        setDomains([...domains, { origin, enabled: true }]);
        setNewDomain("");
      }
    } catch (e) {
      alert("Invalid URL");
    }
  };

  const removeDomain = async (origin: string) => {
    await browser.runtime.sendMessage({
      type: "REMOVE_CUSTOM_DOMAIN",
      payload: { origin },
    });
    setDomains(domains.filter((d) => d.origin !== origin));
  };

  return (
    <Box mt="6">
      <Heading as="h3" size="5">
        Custom Excalidraw Domains
      </Heading>
      <Text size="2">Add self-hosted Excalidraw instances</Text>

      <Flex gap="2" mt="3">
        <Box style={{ maxWidth: "400px", width: "100%" }}>
          <TextField.Root style={{ width: "100%" }}>
            <TextField.Input
              placeholder="https://excalidraw.mycompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
          </TextField.Root>
        </Box>
        <Button onClick={addDomain}>Add Domain</Button>
      </Flex>

      <Box mt="3">
        {domains.map((d) => (
          <Flex
            key={d.origin}
            justify="between"
            align="center"
            p="2"
            style={{
              borderRadius: "6px",
              backgroundColor: "var(--gray-2)",
              border: "1px solid var(--gray-4)",
            }}
            mb="2"
          >
            <Text size="2" style={{ fontFamily: "monospace" }}>
              {d.origin}
            </Text>
            <IconButton
              color="red"
              variant="ghost"
              size="2"
              onClick={() => removeDomain(d.origin)}
              title="Remove domain"
            >
              <TrashIcon width="14" height="14" />
            </IconButton>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};
